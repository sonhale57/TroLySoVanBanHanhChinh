using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Enums;

namespace GovDoc.Infrastructure.Services
{
    public class BackgroundTaskQueue : IBackgroundTaskQueue
    {
        private readonly Channel<IncomingFileQueueItem> _queue;
        private readonly ConcurrentDictionary<string, QueueTaskItemDto> _taskStatuses = new();

        public BackgroundTaskQueue(int capacity = 200)
        {
            var options = new BoundedChannelOptions(capacity)
            {
                FullMode = BoundedChannelFullMode.Wait,
                SingleReader = true, // Xử lý tuần tự FIFO chống quá tải CPU/RAM máy chủ
                SingleWriter = false
            };
            _queue = Channel.CreateBounded<IncomingFileQueueItem>(options);
        }

        public async ValueTask EnqueueAsync(IncomingFileQueueItem item)
        {
            if (item == null) throw new ArgumentNullException(nameof(item));

            RegisterTask(item.TrackingId, item.FileName, item.BatchId);
            await _queue.Writer.WriteAsync(item);
        }

        public async ValueTask<IncomingFileQueueItem> DequeueAsync(CancellationToken cancellationToken)
        {
            return await _queue.Reader.ReadAsync(cancellationToken);
        }

        public void RegisterTask(string trackingId, string fileName, string batchId)
        {
            _taskStatuses.TryAdd(trackingId, new QueueTaskItemDto
            {
                TrackingId = trackingId,
                FileName = fileName,
                Status = QueueTaskStatus.Queued,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        public QueueTaskItemDto? GetTaskStatus(string trackingId)
        {
            _taskStatuses.TryGetValue(trackingId, out var item);
            return item;
        }

        public void UpdateTaskStatus(string trackingId, string status, string? errorMessage = null, Guid? processingLogId = null, ProcessIncomingResultDto? result = null)
        {
            if (_taskStatuses.TryGetValue(trackingId, out var existing))
            {
                existing.Status = status;
                existing.ErrorMessage = errorMessage;
                if (processingLogId.HasValue)
                {
                    existing.ProcessingLogId = processingLogId.Value;
                }
                if (result != null)
                {
                    existing.Result = result;
                }
            }
        }
    }
}
