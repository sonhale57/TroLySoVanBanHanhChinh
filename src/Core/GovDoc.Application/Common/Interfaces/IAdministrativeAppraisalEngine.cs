using System.Collections.Generic;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Entities;

namespace GovDoc.Application.Common.Interfaces
{
    public interface IAdministrativeAppraisalEngine
    {
        Task<AppraisalVerdictDto> EvaluateDocumentAsync(
            OcrExtractionResult ocrResult,
            List<LegalDocument> activeLegalDocs,
            List<LegalDocument> expiredLegalDocs);
    }
}
