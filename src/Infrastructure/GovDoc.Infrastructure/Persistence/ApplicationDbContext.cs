using System;
using System.Threading;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Domain.Entities;
using GovDoc.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace GovDoc.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<UserSession> UserSessions => Set<UserSession>();
        public DbSet<LegalDocument> LegalDocuments => Set<LegalDocument>();
        public DbSet<LegalClauseNode> LegalClauseNodes => Set<LegalClauseNode>();
        public DbSet<LegalRelation> LegalRelations => Set<LegalRelation>();
        public DbSet<ProcessingLog> ProcessingLogs => Set<ProcessingLog>();
        public DbSet<LegalProposal> LegalProposals => Set<LegalProposal>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("Users");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.PasswordHash).HasMaxLength(255).IsRequired();
                entity.Property(e => e.FullName).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Role).HasMaxLength(20).HasDefaultValue("USER");
                entity.Property(e => e.Department).HasMaxLength(150).IsRequired();
            });

            // UserSession
            modelBuilder.Entity<UserSession>(entity =>
            {
                entity.ToTable("UserSessions");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RefreshToken).HasMaxLength(255).IsRequired();
                entity.HasIndex(e => e.RefreshToken).IsUnique();
                entity.HasIndex(e => e.UserId);

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Sessions)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // LegalDocument
            modelBuilder.Entity<LegalDocument>(entity =>
            {
                entity.ToTable("LegalDocuments");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.CodeNumber).HasMaxLength(100).IsRequired();
                entity.Property(e => e.Title).IsRequired();
                entity.Property(e => e.DocType).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Issuer).HasMaxLength(150).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("ACTIVE");

                entity.HasIndex(e => e.CodeNumber);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => new { e.EffectiveDate, e.ExpiredDate });

                entity.HasOne(e => e.Creator)
                      .WithMany()
                      .HasForeignKey(e => e.CreatedBy)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // LegalClauseNode
            modelBuilder.Entity<LegalClauseNode>(entity =>
            {
                entity.ToTable("LegalClauseNodes");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ChapterTitle).HasMaxLength(200);
                entity.Property(e => e.ArticleNumber).HasMaxLength(100).IsRequired();
                entity.Property(e => e.ClauseNumber).HasMaxLength(100);
                entity.Property(e => e.PointIdentifier).HasMaxLength(50);
                entity.Property(e => e.RawContent).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("ACTIVE");

                entity.HasIndex(e => e.DocId);
                entity.HasIndex(e => e.ArticleNumber);

                entity.HasOne(e => e.Document)
                      .WithMany(d => d.ClauseNodes)
                      .HasForeignKey(e => e.DocId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // LegalRelation
            modelBuilder.Entity<LegalRelation>(entity =>
            {
                entity.ToTable("LegalRelations");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.RelationType).HasMaxLength(50).IsRequired();
                entity.Property(e => e.AffectedClauses).HasMaxLength(500);

                entity.HasIndex(e => e.SourceDocId);
                entity.HasIndex(e => e.TargetDocId);

                entity.HasOne(e => e.SourceDoc)
                      .WithMany(d => d.SourceRelations)
                      .HasForeignKey(e => e.SourceDocId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.TargetDoc)
                      .WithMany(d => d.TargetRelations)
                      .HasForeignKey(e => e.TargetDocId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // ProcessingLog
            modelBuilder.Entity<ProcessingLog>(entity =>
            {
                entity.ToTable("ProcessingLogs");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.IncomingDocCode).HasMaxLength(100);
                entity.Property(e => e.IncomingIssuer).HasMaxLength(150);
                entity.Property(e => e.SubjectTitle).HasMaxLength(500);
                entity.Property(e => e.StoredFilePath).HasMaxLength(500);
                entity.Property(e => e.OriginalFileName).HasMaxLength(255).IsRequired();
                entity.Property(e => e.UrgencyLevel).HasMaxLength(50).HasDefaultValue("THUONG");
                entity.Property(e => e.SelectedOptionId).HasMaxLength(50).IsRequired();

                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.CreatedAt);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // LegalProposal
            modelBuilder.Entity<LegalProposal>(entity =>
            {
                entity.ToTable("LegalProposals");
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
                entity.Property(e => e.AttachmentPath).HasMaxLength(500).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("PENDING");

                entity.HasOne(e => e.Submitter)
                      .WithMany()
                      .HasForeignKey(e => e.SubmittedBy)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Reviewer)
                      .WithMany()
                      .HasForeignKey(e => e.ReviewedBy)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
