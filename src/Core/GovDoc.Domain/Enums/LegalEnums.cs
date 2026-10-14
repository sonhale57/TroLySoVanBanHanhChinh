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
}
