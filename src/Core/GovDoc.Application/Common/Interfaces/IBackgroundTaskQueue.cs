using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using GovDoc.Application.DTOs;

namespace GovDoc.Application.Common.Interfaces
{
    public class IncomingFileQueueItem
    {
        public string TrackingId { get; set; } = string.Empty;
        public string BatchId { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public byte[] FileBytes { get; set; } = Array.Empty<byte>();
        public Guid UserId { get; set; }
        public string UserDepartment { get; set; } = string.Empty;
        public string? ClientIp { get; set; }
        public DateTimeOffset EnqueuedAt { get; set; } = DateTimeOffset.UtcNow;
    }

    public interface IBackgroundTaskQueue
    {
        ValueTask EnqueueAsync(IncomingFileQueueItem item);
        ValueTask<IncomingFileQueueItem> DequeueAsync(CancellationToken cancellationToken);
        QueueTaskItemDto? GetTaskStatus(string trackingId);
        void RegisterTask(string trackingId, string fileName, string batchId);
        void UpdateTaskStatus(string trackingId, string status, string? errorMessage = null, Guid? processingLogId = null, ProcessIncomingResultDto? result = null);
    }
}
