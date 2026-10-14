using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Domain.Rules;
using GovDoc.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.Infrastructure.Services
{
    public interface ILegalSearchEngine
    {
        Task<List<LegalSearchResultDto>> SearchAsync(string query, DateTime? pointInTime = null);
        Task<IngestLegalNormResult> IngestNormWithRelationsAsync(IngestLegalNormDto dto, Guid? userId);
    }

    public class IngestLegalNormResult
    {
        public LegalDocument Document { get; set; } = new();
        public List<LegalRelation> CreatedRelations { get; set; } = new();
        public List<string> AutomaticallyExpiredDocuments { get; set; } = new();
    }

    public class LegalSearchEngine : ILegalSearchEngine
    {
        private readonly ApplicationDbContext _context;

        public LegalSearchEngine(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<LegalSearchResultDto>> SearchAsync(string query, DateTime? pointInTime = null)
        {
            var targetDate = pointInTime ?? DateTime.UtcNow;

            var allDocs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Include(d => d.SourceRelations)
                .ThenInclude(r => r.TargetDoc)
                .AsNoTracking()
                .ToListAsync();

            // Lọc văn bản hợp lệ theo quy tắc phân cấp pháp lý & thời điểm
            var validDocs = LegalHierarchyEvaluator.FilterAndOrderValidDocuments(allDocs, targetDate);

            var terms = string.IsNullOrWhiteSpace(query)
                ? Array.Empty<string>()
                : query.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var results = new List<LegalSearchResultDto>();

            foreach (var doc in validDocs)
            {
                // Tìm kiếm trong tiêu đề hoặc số hiệu
                bool matchDoc = terms.Length == 0 ||
                                terms.Any(t => doc.Title.ToLower().Contains(t) || doc.CodeNumber.ToLower().Contains(t));

                var matchedClauses = new List<ClauseExcerptDto>();
                foreach (var node in doc.ClauseNodes)
                {
                    if (!LegalHierarchyEvaluator.IsClauseValid(node, targetDate)) continue;

                    bool matchClause = terms.Length == 0 || terms.Any(t => node.RawContent.ToLower().Contains(t));
                    if (matchClause || matchDoc)
                    {
                        matchedClauses.Add(new ClauseExcerptDto
                        {
                            Id = node.Id,
                            ArticleNumber = node.ArticleNumber,
                            ClauseNumber = node.ClauseNumber,
                            RawContent = node.RawContent,
                            Status = node.Status
                        });
                    }
                }

                if (matchDoc || matchedClauses.Count > 0)
                {
                    var relTitles = doc.SourceRelations
                        .Where(r => r.TargetDoc != null)
                        .Select(r => $"{r.RelationType}: {r.TargetDoc!.CodeNumber} - {r.TargetDoc.Title}")
                        .ToList();

                    results.Add(new LegalSearchResultDto
                    {
                        DocId = doc.Id,
                        CodeNumber = doc.CodeNumber,
                        Title = doc.Title,
                        DocType = doc.DocType,
                        HierarchyRank = doc.HierarchyRank,
                        Issuer = doc.Issuer,
                        EffectiveDate = doc.EffectiveDate,
                        ExpiredDate = doc.ExpiredDate,
                        Status = doc.Status,
                        IsDraft = doc.IsDraft,
                        MatchedClauses = matchedClauses,
                        RelatedDocuments = relTitles
                    });
                }
            }

            return results;
        }

        public async Task<IngestLegalNormResult> IngestNormWithRelationsAsync(IngestLegalNormDto dto, Guid? userId)
        {
            var result = new IngestLegalNormResult();

            var rank = LegalHierarchyEvaluator.GetRankByDocType(dto.DocType);
            var newDoc = new LegalDocument
            {
                Id = Guid.NewGuid(),
                CodeNumber = dto.CodeNumber.Trim(),
                Title = dto.Title.Trim(),
                DocType = dto.DocType,
                HierarchyRank = rank,
                Issuer = dto.Issuer.Trim(),
                IssuedDate = dto.IssuedDate,
                EffectiveDate = dto.EffectiveDate,
                ExpiredDate = dto.ExpiredDate,
                Status = dto.Status ?? LegalStatus.Active,
                IsDraft = dto.IsDraft,
                CreatedBy = userId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            await _context.LegalDocuments.AddAsync(newDoc);
            result.Document = newDoc;

            // Phân tách Điều/Khoản cơ bản từ FullContent nếu có
            if (!string.IsNullOrWhiteSpace(dto.FullContent))
            {
                var articleMatches = Regex.Matches(dto.FullContent, @"(Điều\s+\d+[^:\r\n]*[:\.\r\n]+)(.*?)(?=(Điều\s+\d+)|$)", RegexOptions.Singleline | RegexOptions.IgnoreCase);
                if (articleMatches.Count > 0)
                {
                    foreach (Match m in articleMatches)
                    {
                        var artHeader = m.Groups[1].Value.Trim(':', '.', '\r', '\n', ' ');
                        var artBody = m.Groups[2].Value.Trim();
                        newDoc.ClauseNodes.Add(new LegalClauseNode
                        {
                            Id = Guid.NewGuid(),
                            DocId = newDoc.Id,
                            ArticleNumber = artHeader,
                            RawContent = string.IsNullOrWhiteSpace(artBody) ? artHeader : artBody,
                            Status = LegalStatus.Active
                        });
                    }
                }
                else
                {
                    newDoc.ClauseNodes.Add(new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = newDoc.Id,
                        ArticleNumber = "Toàn văn",
                        RawContent = dto.FullContent.Trim(),
                        Status = LegalStatus.Active
                    });
                }
            }

            // Tự động phân tích câu "thay thế Nghị định số..." hoặc "sửa đổi, bổ sung..."
            var replacesPattern = Regex.Match(dto.FullContent ?? string.Empty, @"(thay thế|bãi bỏ)\s+(Nghị định|Thông tư|Quyết định|Luật)\s+số\s+([0-9]+/[0-9]+/[A-Z0-9\-]+)", RegexOptions.IgnoreCase);
            string? targetReplacesCode = dto.ReplacesDocCode;
            if (string.IsNullOrEmpty(targetReplacesCode) && replacesPattern.Success)
            {
                targetReplacesCode = replacesPattern.Groups[3].Value.Trim();
            }

            if (!string.IsNullOrEmpty(targetReplacesCode))
            {
                var targetDoc = await _context.LegalDocuments
                    .FirstOrDefaultAsync(d => d.CodeNumber.ToLower() == targetReplacesCode.ToLower() || d.CodeNumber.Contains(targetReplacesCode));

                if (targetDoc != null)
                {
                    var relation = new LegalRelation
                    {
                        Id = Guid.NewGuid(),
                        SourceDocId = newDoc.Id,
                        TargetDocId = targetDoc.Id,
                        RelationType = RelationType.Replaces,
                        AffectedClauses = "Toàn bộ",
                        LegalBasisClause = replacesPattern.Success ? replacesPattern.Value : $"Thay thế văn bản {targetDoc.CodeNumber}"
                    };

                    await _context.LegalRelations.AddAsync(relation);
                    result.CreatedRelations.Add(relation);

                    // Tự động cập nhật văn bản cũ thành EXPIRED nếu văn bản mới có hiệu lực
                    if (newDoc.Status == LegalStatus.Active && !newDoc.IsDraft)
                    {
                        targetDoc.Status = LegalStatus.Expired;
                        targetDoc.ExpiredDate = newDoc.EffectiveDate;
                        targetDoc.UpdatedAt = DateTimeOffset.UtcNow;
                        result.AutomaticallyExpiredDocuments.Add(targetDoc.CodeNumber);
                    }
                }
            }

            await _context.SaveChangesAsync();
            return result;
        }
    }
}
