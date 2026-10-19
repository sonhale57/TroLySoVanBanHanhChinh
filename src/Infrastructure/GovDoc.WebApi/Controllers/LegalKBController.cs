using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using GovDoc.Domain.Rules;
using GovDoc.Infrastructure.Persistence;
using GovDoc.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GovDoc.WebApi.Controllers
{
    [ApiController]
    [Route("api/v1/[controller]")]
    public class LegalKBController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILegalSearchEngine _searchEngine;
        private readonly IOcrService _ocrService;
        private readonly IFileStorageService _storageService;

        public LegalKBController(
            ApplicationDbContext context,
            ILegalSearchEngine searchEngine,
            IOcrService ocrService,
            IFileStorageService storageService)
        {
            _context = context;
            _searchEngine = searchEngine;
            _ocrService = ocrService;
            _storageService = storageService;
        }

        [AllowAnonymous]
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] DateTime? pointInTime)
        {
            var results = await _searchEngine.SearchAsync(q ?? string.Empty, pointInTime);
            return Ok(results);
        }

        [AllowAnonymous]
        [HttpGet("documents")]
        public async Task<IActionResult> GetAllDocuments()
        {
            var docs = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Include(d => d.SourceRelations)
                .ThenInclude(r => r.TargetDoc)
                .OrderByDescending(d => d.HierarchyRank)
                .ThenByDescending(d => d.IssuedDate)
                .Select(d => new
                {
                    d.Id,
                    d.CodeNumber,
                    d.Title,
                    d.DocType,
                    d.HierarchyRank,
                    d.Issuer,
                    d.IssuedDate,
                    d.EffectiveDate,
                    d.ExpiredDate,
                    d.Status,
                    d.IsDraft,
                    ClausesCount = d.ClauseNodes.Count,
                    Clauses = d.ClauseNodes.Select(c => new
                    {
                        c.Id,
                        c.ArticleNumber,
                        c.ClauseNumber,
                        c.RawContent,
                        c.Status
                    }),
                    Relations = d.SourceRelations.Select(r => new
                    {
                        r.Id,
                        r.RelationType,
                        r.AffectedClauses,
                        r.LegalBasisClause,
                        TargetCode = r.TargetDoc != null ? r.TargetDoc.CodeNumber : string.Empty,
                        TargetTitle = r.TargetDoc != null ? r.TargetDoc.Title : string.Empty
                    })
                })
                .ToListAsync();

            return Ok(docs);
        }

        /// <summary>
        /// Xem chi tiết văn bản pháp luật kèm toàn bộ điều khoản và quan hệ pháp lý
        /// </summary>
        [AllowAnonymous]
        [HttpGet("documents/{id}")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetDocumentById(Guid id)
        {
            var doc = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .Include(d => d.SourceRelations)
                .ThenInclude(r => r.TargetDoc)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null)
            {
                return NotFound(new { message = "Không tìm thấy văn bản quy phạm pháp luật." });
            }

            return Ok(new
            {
                doc.Id,
                doc.CodeNumber,
                doc.Title,
                doc.DocType,
                doc.HierarchyRank,
                doc.Issuer,
                doc.IssuedDate,
                doc.EffectiveDate,
                doc.ExpiredDate,
                doc.Status,
                doc.IsDraft,
                ClausesCount = doc.ClauseNodes.Count,
                Clauses = doc.ClauseNodes.OrderBy(c => c.CreatedAt).Select(c => new
                {
                    c.Id,
                    c.ArticleNumber,
                    c.ClauseNumber,
                    c.RawContent,
                    c.Status
                }),
                Relations = doc.SourceRelations.Select(r => new
                {
                    r.Id,
                    r.RelationType,
                    r.AffectedClauses,
                    r.LegalBasisClause,
                    TargetCode = r.TargetDoc != null ? r.TargetDoc.CodeNumber : string.Empty,
                    TargetTitle = r.TargetDoc != null ? r.TargetDoc.Title : string.Empty
                })
            });
        }

        // ==========================================
        // PHASE 2: TỦ SÁCH PHÁP LUẬT QUẢN TRỊ TRỰC QUAN
        // ==========================================

        /// <summary>
        /// Import 1-chạm: Kéo tệp tin văn bản -> Tự động OCR & Nhận diện thay thế -> Trả về kết quả đối soát
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpPost("quick-import")]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> QuickImportLegalDoc([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Vui lòng chọn tệp tin văn bản quy phạm pháp luật để tải lên." });
            }

            using var stream = file.OpenReadStream();
            var ocr = await _ocrService.ExtractDocumentTextAsync(stream, file.FileName);
            var savedPath = await _storageService.SaveFileAsync(stream, file.FileName, "legalkb");

            string text = ocr.ExtractedText;

            // Bóc tách Số hiệu (vd: 123/2026/NĐ-CP hoặc Quyết định số ...)
            var codeMatch = Regex.Match(text, @"(Số|Số:)\s*([0-9]+/[0-9]+/[A-Z0-9\-]+)", RegexOptions.IgnoreCase);
            string detectedCode = codeMatch.Success ? codeMatch.Groups[2].Value.Trim() : Path.GetFileNameWithoutExtension(file.FileName);

            // Bóc tách trích yếu
            var titleMatch = Regex.Match(text, @"(V/v|về việc|Nghị định quy định|Luật)\s*([^\r\n]+)", RegexOptions.IgnoreCase);
            string detectedTitle = titleMatch.Success ? titleMatch.Value.Trim() : ocr.SubjectTitle;
            if (string.IsNullOrWhiteSpace(detectedTitle))
            {
                detectedTitle = $"Văn bản quy phạm pháp luật {detectedCode}";
            }

            // Phát hiện câu bãi bỏ / thay thế (vd: "thay thế Nghị định số 45/2019/NĐ-CP")
            var replaceMatch = Regex.Match(text, @"(thay thế|bãi bỏ)\s+(Nghị định|Thông tư|Quyết định|Luật)\s+số\s+([0-9]+/[0-9]+/[A-Z0-9\-]+)", RegexOptions.IgnoreCase);
            string? replacesCode = replaceMatch.Success ? replaceMatch.Groups[3].Value.Trim() : null;

            LegalDocument? existingOldDoc = null;
            if (!string.IsNullOrEmpty(replacesCode))
            {
                existingOldDoc = await _context.LegalDocuments.FirstOrDefaultAsync(d => d.CodeNumber.Contains(replacesCode));
            }

            var result = new QuickImportResultDto
            {
                DetectedCode = detectedCode,
                DetectedTitle = detectedTitle,
                DocType = detectedCode.Contains("NĐ-CP") ? "NGHI_DINH" : detectedCode.Contains("QH") ? "LUAT" : "THONG_TU",
                Issuer = ocr.DetectedIssuer.Length > 0 ? ocr.DetectedIssuer : "Chính phủ",
                EffectiveDate = DateTime.Now.Date,
                ReplacesDocCode = replacesCode,
                ReplacesDocTitle = existingOldDoc?.Title,
                SuggestedAction = existingOldDoc != null ? "INVALIDATE_OLD_DOC" : "NONE",
                ExtractedSummary = $"Hệ thống đã nhận diện văn bản {detectedCode}. {(existingOldDoc != null ? $"Phát hiện câu thay thế văn bản {replacesCode} đang có trong kho dữ liệu." : "Không phát hiện quan hệ thay thế.")}",
                ExistingTargetDocId = existingOldDoc?.Id
            };

            return Ok(result);
        }

        /// <summary>
        /// Thêm thủ công văn bản kèm điều khoản chi tiết
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpPost("manual")]
        public async Task<IActionResult> AddManualDoc([FromBody] ManualLegalDocDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CodeNumber) || string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(new { message = "Số ký hiệu và Tên văn bản là bắt buộc." });
            }

            var adminIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid? adminId = Guid.TryParse(adminIdStr, out var parsedGuid) ? parsedGuid : null;
            var rank = LegalHierarchyEvaluator.GetRankByDocType(dto.DocType);

            var doc = new LegalDocument
            {
                Id = Guid.NewGuid(),
                CodeNumber = dto.CodeNumber.Trim(),
                Title = dto.Title.Trim(),
                DocType = dto.DocType,
                HierarchyRank = rank,
                Issuer = dto.Issuer,
                IssuedDate = dto.EffectiveDate.AddDays(-15),
                EffectiveDate = dto.EffectiveDate,
                ExpiredDate = dto.ExpiredDate,
                Status = dto.Status ?? "ACTIVE",
                IsDraft = false,
                CreatedBy = adminId,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            if (dto.Clauses != null && dto.Clauses.Any())
            {
                foreach (var c in dto.Clauses)
                {
                    if (string.IsNullOrWhiteSpace(c.ArticleNumber) && string.IsNullOrWhiteSpace(c.RawContent))
                        continue;

                    doc.ClauseNodes.Add(new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = doc.Id,
                        ArticleNumber = string.IsNullOrWhiteSpace(c.ArticleNumber) ? "Quy định" : c.ArticleNumber.Trim(),
                        ClauseNumber = c.ClauseNumber?.Trim(),
                        RawContent = c.RawContent.Trim(),
                        Status = c.Status ?? LegalStatus.Active
                    });
                }
            }
            else
            {
                doc.ClauseNodes.Add(new LegalClauseNode
                {
                    Id = Guid.NewGuid(),
                    DocId = doc.Id,
                    ArticleNumber = "Quy định chung",
                    RawContent = dto.Notes ?? dto.Title,
                    Status = LegalStatus.Active
                });
            }

            await _context.LegalDocuments.AddAsync(doc);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Thêm văn bản vào Tủ sách Pháp lý thành công.", id = doc.Id });
        }

        /// <summary>
        /// Sửa thông tin văn bản và toàn bộ điều khoản chi tiết
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDoc(Guid id, [FromBody] UpdateLegalDocDto dto)
        {
            var doc = await _context.LegalDocuments
                .Include(d => d.ClauseNodes)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null)
            {
                return NotFound(new { message = "Không tìm thấy văn bản quy phạm pháp luật." });
            }

            doc.CodeNumber = dto.CodeNumber.Trim();
            doc.Title = dto.Title.Trim();
            doc.DocType = dto.DocType;
            doc.HierarchyRank = LegalHierarchyEvaluator.GetRankByDocType(dto.DocType);
            doc.Issuer = dto.Issuer;
            doc.EffectiveDate = dto.EffectiveDate;
            doc.ExpiredDate = dto.ExpiredDate;
            doc.Status = dto.Status;
            doc.UpdatedAt = DateTimeOffset.UtcNow;

            // Đồng bộ nội dung các Điều khoản (Clauses)
            if (dto.Clauses != null)
            {
                var keptIds = new HashSet<Guid>();

                foreach (var clauseDto in dto.Clauses)
                {
                    if (string.IsNullOrWhiteSpace(clauseDto.ArticleNumber) && string.IsNullOrWhiteSpace(clauseDto.RawContent))
                        continue;

                    if (clauseDto.Id.HasValue && clauseDto.Id.Value != Guid.Empty)
                    {
                        var existingNode = doc.ClauseNodes.FirstOrDefault(c => c.Id == clauseDto.Id.Value);
                        if (existingNode != null)
                        {
                            existingNode.ArticleNumber = string.IsNullOrWhiteSpace(clauseDto.ArticleNumber) ? "Quy định" : clauseDto.ArticleNumber.Trim();
                            existingNode.ClauseNumber = clauseDto.ClauseNumber?.Trim();
                            existingNode.RawContent = clauseDto.RawContent.Trim();
                            existingNode.Status = clauseDto.Status ?? LegalStatus.Active;
                            keptIds.Add(existingNode.Id);
                            continue;
                        }
                    }

                    // Điều khoản mới thêm
                    var newNode = new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = doc.Id,
                        ArticleNumber = string.IsNullOrWhiteSpace(clauseDto.ArticleNumber) ? "Quy định" : clauseDto.ArticleNumber.Trim(),
                        ClauseNumber = clauseDto.ClauseNumber?.Trim(),
                        RawContent = clauseDto.RawContent.Trim(),
                        Status = clauseDto.Status ?? LegalStatus.Active
                    };
                    await _context.LegalClauseNodes.AddAsync(newNode);
                    keptIds.Add(newNode.Id);
                }

                // Xóa các điều khoản cũ không còn trong danh sách gửi lên
                var nodesToRemove = doc.ClauseNodes.Where(c => !keptIds.Contains(c.Id)).ToList();
                if (nodesToRemove.Any())
                {
                    _context.LegalClauseNodes.RemoveRange(nodesToRemove);
                }
            }
            else if (!string.IsNullOrWhiteSpace(dto.Notes))
            {
                if (!doc.ClauseNodes.Any())
                {
                    var fallbackNode = new LegalClauseNode
                    {
                        Id = Guid.NewGuid(),
                        DocId = doc.Id,
                        ArticleNumber = "Quy định chung",
                        RawContent = dto.Notes.Trim(),
                        Status = LegalStatus.Active
                    };
                    await _context.LegalClauseNodes.AddAsync(fallbackNode);
                }
                else
                {
                    var first = doc.ClauseNodes.First();
                    first.RawContent = dto.Notes.Trim();
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thông tin và điều khoản văn bản thành công." });
        }

        /// <summary>
        /// Đổi trạng thái: Còn hiệu lực / Hết hiệu lực trực tiếp trên từng dòng
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateDocumentStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            var doc = await _context.LegalDocuments
                .Include(d => d.SourceRelations)
                .ThenInclude(r => r.TargetDoc)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null)
            {
                return NotFound(new { message = "Không tìm thấy văn bản quy phạm pháp luật." });
            }

            doc.Status = request.Status;
            if (request.Status == "EXPIRED" && !doc.ExpiredDate.HasValue)
            {
                doc.ExpiredDate = DateTime.Now.Date;
            }
            else if (request.Status == "ACTIVE")
            {
                doc.ExpiredDate = null;
                doc.IsDraft = false;

                // Tự động hết hiệu lực văn bản cũ nếu có quan hệ Replaces
                foreach (var relation in doc.SourceRelations.Where(r => r.RelationType == RelationType.Replaces))
                {
                    if (relation.TargetDoc != null)
                    {
                        relation.TargetDoc.Status = LegalStatus.Expired;
                        relation.TargetDoc.ExpiredDate = doc.EffectiveDate;
                        relation.TargetDoc.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
            }

            doc.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã cập nhật trạng thái văn bản {doc.CodeNumber} thành {doc.Status}.", status = doc.Status });
        }

        /// <summary>
        /// Xóa văn bản (với xác nhận)
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDoc(Guid id)
        {
            var doc = await _context.LegalDocuments
                .Include(d => d.SourceRelations)
                .Include(d => d.TargetRelations)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (doc == null)
            {
                return NotFound(new { message = "Không tìm thấy văn bản quy phạm pháp luật." });
            }

            _context.LegalRelations.RemoveRange(doc.SourceRelations);
            _context.LegalRelations.RemoveRange(doc.TargetRelations);
            _context.LegalDocuments.Remove(doc);

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã xóa văn bản {doc.CodeNumber} khỏi Tủ sách pháp lý." });
        }

        // ==========================================
        // PHÂN HỆ ĐỀ XUẤT CẬP NHẬT LUẬT (LEGAL PROPOSALS)
        // ==========================================

        /// <summary>
        /// Lấy danh sách đề xuất cập nhật luật từ cán bộ
        /// </summary>
        [Authorize]
        [HttpGet("proposals")]
        public async Task<IActionResult> GetProposals()
        {
            // Tự động gieo mẫu nếu chưa có dữ liệu
            if (!await _context.LegalProposals.AnyAsync())
            {
                var userChuyenVien = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.User)
                                     ?? await _context.Users.FirstOrDefaultAsync();
                var userAdmin = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);

                if (userChuyenVien != null)
                {
                    _context.LegalProposals.AddRange(
                        new LegalProposal
                        {
                            Id = Guid.NewGuid(),
                            SubmittedBy = userChuyenVien.Id,
                            Title = "Đề xuất cập nhật nội dung Dự thảo sửa đổi Nghị định 45/2021/NĐ-CP",
                            Notes = "Kính gửi Lãnh đạo Phòng, hiện tại đã có hướng dẫn mới về định mức đầu tư hạ tầng cụm công nghiệp, đề xuất nạp vào hệ thống để tra cứu.",
                            AttachmentPath = "storage/proposals/DuThao_NghiDinh_CCN_2026.pdf",
                            Status = "PENDING",
                            CreatedAt = DateTimeOffset.UtcNow.AddHours(-5)
                        },
                        new LegalProposal
                        {
                            Id = Guid.NewGuid(),
                            SubmittedBy = userChuyenVien.Id,
                            Title = "Bổ sung Thông tư hướng dẫn quy trình bồi thường GPMB đất nông nghiệp",
                            Notes = "Đề xuất bổ sung để phục vụ giải quyết công văn 142/UBND-KT và các hồ sơ tương tự.",
                            AttachmentPath = "storage/proposals/ThongTu_BoiThuong_GPMB.pdf",
                            Status = "APPROVED",
                            AdminResponseNote = "Đã tiếp nhận và giao Bộ phận Pháp chế cập nhật vào Tủ sách pháp luật.",
                            ReviewedBy = userAdmin?.Id,
                            ReviewedAt = DateTimeOffset.UtcNow.AddHours(-1),
                            CreatedAt = DateTimeOffset.UtcNow.AddDays(-1)
                        }
                    );
                    await _context.SaveChangesAsync();
                }
            }

            var proposals = await _context.LegalProposals
                .Include(p => p.Submitter)
                .Include(p => p.Reviewer)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new LegalProposalItemDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Notes = p.Notes,
                    AttachmentPath = p.AttachmentPath,
                    Status = p.Status,
                    AdminResponseNote = p.AdminResponseNote,
                    SubmittedBy = p.SubmittedBy,
                    SubmitterName = p.Submitter != null ? p.Submitter.FullName : "Cán bộ chuyên viên",
                    SubmitterDepartment = p.Submitter != null ? p.Submitter.Department : "Phòng Pháp chế",
                    ReviewedBy = p.ReviewedBy,
                    ReviewerName = p.Reviewer != null ? p.Reviewer.FullName : null,
                    CreatedAt = p.CreatedAt,
                    ReviewedAt = p.ReviewedAt
                })
                .ToListAsync();

            return Ok(proposals);
        }

        /// <summary>
        /// Chuyên viên gửi đề xuất cập nhật văn bản pháp luật mới
        /// </summary>
        [Authorize]
        [HttpPost("proposals")]
        public async Task<IActionResult> SubmitProposal([FromForm] string title, [FromForm] string? notes, [FromForm] IFormFile? file)
        {
            if (string.IsNullOrWhiteSpace(title))
            {
                return BadRequest(new { message = "Tiêu đề đề xuất văn bản là bắt buộc." });
            }

            // Lấy danh tính người nạp từ Token
            var userIdStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính cán bộ thực hiện. Vui lòng đăng nhập lại." });
            }

            var submitter = await _context.Users.FindAsync(userId);
            if (submitter == null || !submitter.IsActive)
            {
                return Unauthorized(new { message = "Tài khoản cán bộ không tồn tại hoặc đã bị khóa quyền truy cập." });
            }

            string savedPath = "storage/proposals/de_xuat_dinh_kem.pdf";
            if (file != null && file.Length > 0)
            {
                using var stream = file.OpenReadStream();
                savedPath = await _storageService.SaveFileAsync(stream, file.FileName, "proposals");
            }

            var proposal = new LegalProposal
            {
                Id = Guid.NewGuid(),
                SubmittedBy = submitter!.Id,
                Title = title.Trim(),
                Notes = notes,
                AttachmentPath = savedPath,
                Status = "PENDING",
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _context.LegalProposals.AddAsync(proposal);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đề xuất văn bản pháp luật đã được gửi tới Lãnh đạo thẩm duyệt.", id = proposal.Id });
        }

        /// <summary>
        /// Lãnh đạo (Admin) thẩm duyệt hoặc từ chối đề xuất
        /// </summary>
        [Authorize(Roles = UserRole.Admin)]
        [HttpPut("proposals/{id}/review")]
        public async Task<IActionResult> ReviewProposal(Guid id, [FromBody] ReviewLegalProposalDto dto)
        {
            var proposal = await _context.LegalProposals.FindAsync(id);
            if (proposal == null)
            {
                return NotFound(new { message = "Không tìm thấy đề xuất pháp lý này." });
            }

            var adminIdStr = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid? adminId = Guid.TryParse(adminIdStr, out var adminGuid) ? adminGuid : null;

            proposal.Status = dto.Status.ToUpper(); // APPROVED or REJECTED
            proposal.AdminResponseNote = dto.AdminResponseNote;
            proposal.ReviewedBy = adminId;
            proposal.ReviewedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Đã cập nhật trạng thái đề xuất thành: {proposal.Status}." });
        }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = "ACTIVE";
    }
}
