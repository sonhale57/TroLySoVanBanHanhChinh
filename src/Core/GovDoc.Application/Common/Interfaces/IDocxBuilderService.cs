using System.Collections.Generic;

namespace GovDoc.Application.Common.Interfaces
{
    public class OfficialDispatchDraftModel
    {
        public string IssuerParent { get; set; } = "ỦY BAN NHÂN DÂN";
        public string IssuerName { get; set; } = "VĂN PHÒNG";
        public string DocCode { get; set; } = "..../VP-UBND";
        public string Location { get; set; } = "Địa danh";
        public string DocDateStr { get; set; } = string.Empty;
        public string SubjectTitle { get; set; } = "V/v xử lý văn bản hành chính";
        public string RecipientMain { get; set; } = "Cơ quan gửi công văn";
        public List<string> LegalBases { get; set; } = new List<string>();
        public List<string> ContentParagraphs { get; set; } = new List<string>();
        public List<string> RecipientsList { get; set; } = new List<string>();
        public string SignerTitle { get; set; } = "CHÁNH VĂN PHÒNG";
        public string SignerName { get; set; } = string.Empty;
    }

    public interface IDocxBuilderService
    {
        byte[] GenerateOfficialDispatch(OfficialDispatchDraftModel model);
    }
}
