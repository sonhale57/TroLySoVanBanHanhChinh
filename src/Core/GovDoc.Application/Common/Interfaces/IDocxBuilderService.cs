using System.Collections.Generic;

namespace GovDoc.Application.Common.Interfaces
{
    public class OfficialDispatchDraftModel
    {
        public string IssuerParent { get; set; } = "ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG";
        public string IssuerName { get; set; } = "VĂN PHÒNG";
        public string DocCode { get; set; } = "142/VP-KT";
        public string Location { get; set; } = "Bình Dương";
        public string DocDateStr { get; set; } = "12 tháng 10 năm 2026";
        public string SubjectTitle { get; set; } = "Ý kiến về việc xin gia hạn tiến độ thực hiện dự án Cụm công nghiệp X";
        public string RecipientMain { get; set; } = "Sở Kế hoạch và Đầu tư tỉnh Bình Dương";
        public List<string> LegalBases { get; set; } = new List<string>();
        public List<string> ContentParagraphs { get; set; } = new List<string>();
        public List<string> RecipientsList { get; set; } = new List<string>();
        public string SignerTitle { get; set; } = "CHÁNH VĂN PHÒNG";
        public string SignerName { get; set; } = "Nguyễn Văn An";
    }

    public interface IDocxBuilderService
    {
        byte[] GenerateOfficialDispatch(OfficialDispatchDraftModel model);
    }
}
