namespace GovDoc.Domain.Enums
{
    public static class UserRole
    {
        public const string Admin = "ADMIN";
        public const string User = "USER";
        public const string Specialist = "SPECIALIST";
    }

    public static class LegalDocType
    {
        public const string Constitution = "HIEN_PHAP";           // Rank 100
        public const string Law = "LUAT";                          // Rank 90
        public const string Ordinance = "PHAP_LENH";              // Rank 80
        public const string Decree = "NGHI_DINH";                  // Rank 70
        public const string DecisionPM = "QUYET_DINH_TTG";         // Rank 60
        public const string Circular = "THONG_TU";                 // Rank 50
        public const string DecisionProv = "QUYET_DINH_UBND";      // Rank 40
        public const string Directive = "CHI_THI";                 // Rank 35
        public const string OfficialDispatch = "CONG_VAN";         // Rank 30
        public const string Notice = "THONG_BAO";                  // Rank 25
        public const string Report = "BAO_CAO";                    // Rank 20
        public const string InternalRegulation = "QUY_CHE_NOI_BO"; // Rank 15
    }

    public static class LegalStatus
    {
        public const string Active = "ACTIVE";
        public const string Expired = "EXPIRED";
        public const string ExpiredPartial = "EXPIRED_PARTIAL";
        public const string Draft = "DRAFT";
    }

    public static class RelationType
    {
        public const string Replaces = "REPLACES";
        public const string Amends = "AMENDS";
        public const string Repeals = "REPEALS";
        public const string Guides = "GUIDES";
    }

    /// <summary>
    /// Phân loại phạm vi văn bản: QPPL, Hành chính cá biệt, Hướng dẫn nghiệp vụ
    /// </summary>
    public static class DocumentScope
    {
        public const string QPPL = "QPPL";
        public const string HanhChinh = "HANH_CHINH";
        public const string HuongDanNghiepVu = "HUONG_DAN_NGHIEP_VU";
    }

    /// <summary>
    /// Danh mục 7 Khối lĩnh vực chuyên môn công vụ
    /// </summary>
    public static class FieldCategory
    {
        public const string DatDaiXayDung = "DAT_DAI_XAY_DUNG";
        public const string KinhTeTaiChinh = "KINH_TE_TAI_CHINH";
        public const string NoiVuToChuc = "NOI_VU_TO_CHUC";
        public const string TuPhapPhapChe = "TU_PHAP_PHAP_CHE";
        public const string ThanhTraKhieuNai = "THANH_TRA_KHIEU_NAI";
        public const string VanHoaXaHoi = "VAN_HOA_XA_HOI";
        public const string QuanTriVanPhong = "QUAN_TRI_VAN_PHONG";
    }

    /// <summary>
    /// Vòng đời 4 trạng thái hồ sơ công văn (Finite State Machine)
    /// </summary>
    public static class DocumentCurrentStatus
    {
        public const string ChoXuLy = "CHO_XU_LY";
        public const string DangXuLy = "DANG_XU_LY";
        public const string DaXuLy = "DA_XU_LY";
        public const string DaKy = "DA_KY";
    }

    /// <summary>
    /// Cấp độ khẩn công văn
    /// </summary>
    public static class UrgencyLevel
    {
        public const string HoaToc = "HOA_TOC";
        public const string ThuongKhan = "THUONG_KHAN";
        public const string Khan = "KHAN";
        public const string Thuong = "THUONG";
    }

    /// <summary>
    /// Nhà cung cấp AI cá nhân (BYOK)
    /// </summary>
    public static class AiProviderType
    {
        public const string OpenAI = "OPENAI";
        public const string Gemini = "GEMINI";
        public const string Anthropic = "ANTHROPIC";
        public const string OpenRouter = "OPENROUTER";
    }

    /// <summary>
    /// Trạng thái hàng đợi xử lý tài liệu
    /// </summary>
    public static class QueueTaskStatus
    {
        public const string Queued = "QUEUED";
        public const string Processing = "PROCESSING";
        public const string Completed = "COMPLETED";
        public const string Failed = "FAILED";
    }
}
