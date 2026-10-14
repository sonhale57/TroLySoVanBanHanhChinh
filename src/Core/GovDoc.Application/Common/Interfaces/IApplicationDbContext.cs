using System.Threading;
using System.Threading.Tasks;
using GovDoc.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<User> Users { get; }
        DbSet<UserSession> UserSessions { get; }
        DbSet<LegalDocument> LegalDocuments { get; }
        DbSet<LegalClauseNode> LegalClauseNodes { get; }
        DbSet<LegalRelation> LegalRelations { get; }
        DbSet<ProcessingLog> ProcessingLogs { get; }
        DbSet<LegalProposal> LegalProposals { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
