using System;
using System.Collections.Generic;
using System.Linq;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;

namespace GovDoc.Domain.Rules
{
    public class LegalHierarchyEvaluator
    {
        public static int GetRankByDocType(string docType)
        {
            return docType?.ToUpperInvariant() switch
            {
                LegalDocType.Constitution or "HIẾN PHÁP" or "HIEN_PHAP" => 100,
                LegalDocType.Law or "LUẬT" or "BỘ LUẬT" or "NGHỊ QUYẾT QUỐC HỘI" or "LUAT" => 90,
                LegalDocType.Ordinance or "PHÁP LỆNH" or "PHAP_LENH" => 80,
                LegalDocType.Decree or "NGHỊ ĐỊNH" or "NGHI_DINH" => 70,
                LegalDocType.DecisionPM or "QUYẾT ĐỊNH THỦ TƯỚNG" or "QUYET_DINH_TTG" => 60,
                LegalDocType.Circular or "THÔNG TƯ" or "THONG_TU" => 50,
                LegalDocType.DecisionProv or "QUYẾT ĐỊNH UBND TỈNH" or "QUYET_DINH_UBND" => 40,
                _ => 30
            };
        }

        /// <summary>
        /// Kiểm tra tính hiệu lực của văn bản tại một thời điểm cụ thể (Point-in-Time Temporal Validity)
        /// Tuân thủ Điều 156 Luật Ban hành VBQPPL.
        /// </summary>
        public static bool IsValidAtPointInTime(LegalDocument doc, DateTime pointInTime)
        {
            if (doc == null) return false;

            // Khóa cứng: Văn bản dự thảo không có hiệu lực thi hành chính thức
            if (doc.IsDraft) return false;

            // Chưa tới ngày có hiệu lực
            if (doc.EffectiveDate > pointInTime.Date) return false;

            // Đã hết hiệu lực tại mốc thời gian xét
            if (doc.ExpiredDate.HasValue && pointInTime.Date >= doc.ExpiredDate.Value.Date) return false;

            // Nếu không có ExpiredDate cụ thể nhưng bị đánh dấu là EXPIRED
            if (!doc.ExpiredDate.HasValue && doc.Status.Equals(LegalStatus.Expired, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Kiểm tra tính hiệu lực của Điều/Khoản cụ thể (Partial Invalidation)
        /// </summary>
        public static bool IsClauseValid(LegalClauseNode clause, DateTime pointInTime)
        {
            if (clause == null) return false;

            if (clause.Status.Equals(LegalStatus.Expired, StringComparison.OrdinalIgnoreCase) ||
                clause.Status.Equals(LegalStatus.ExpiredPartial, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (clause.Document != null)
            {
                return IsValidAtPointInTime(clause.Document, pointInTime);
            }

            return true;
        }

        /// <summary>
        /// So sánh 2 văn bản khi có xung đột quy định:
        /// 1. Ưu tiên văn bản có hiệu lực cao hơn (HierarchyRank)
        /// 2. Nếu cùng cấp, ưu tiên văn bản ban hành sau (IssuedDate)
        /// Trả về số dương nếu docA ưu tiên hơn, số âm nếu docB ưu tiên hơn, 0 nếu tương đương.
        /// </summary>
        public static int CompareLegalPrecedence(LegalDocument docA, LegalDocument docB)
        {
            if (docA == null && docB == null) return 0;
            if (docA == null) return -1;
            if (docB == null) return 1;

            int rankA = docA.HierarchyRank > 0 ? docA.HierarchyRank : GetRankByDocType(docA.DocType);
            int rankB = docB.HierarchyRank > 0 ? docB.HierarchyRank : GetRankByDocType(docB.DocType);

            if (rankA != rankB)
            {
                return rankA.CompareTo(rankB);
            }

            // Cùng cấp, ưu tiên văn bản ban hành sau
            return docA.IssuedDate.CompareTo(docB.IssuedDate);
        }

        /// <summary>
        /// Lọc và sắp xếp danh sách văn bản / điều khoản theo đúng thứ bậc ưu tiên và loại trừ văn bản hết hiệu lực
        /// </summary>
        public static List<LegalDocument> FilterAndOrderValidDocuments(
            IEnumerable<LegalDocument> documents,
            DateTime? pointInTime = null)
        {
            var targetDate = pointInTime ?? DateTime.UtcNow;

            return documents
                .Where(d => IsValidAtPointInTime(d, targetDate))
                .OrderByDescending(d => d.HierarchyRank > 0 ? d.HierarchyRank : GetRankByDocType(d.DocType))
                .ThenByDescending(d => d.IssuedDate)
                .ToList();
        }
    }
}
