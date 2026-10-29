using System;
using System.Threading;
using System.Threading.Tasks;
using GovDoc.Application.Common.Interfaces;
using GovDoc.Application.DTOs;
using GovDoc.Domain.Enums;
using GovDoc.Infrastructure.Services;
using Xunit;

namespace GovDoc.Tests
{
    public class BackgroundQueueTests
    {
        [Fact]
        public async Task EnqueueAndDequeue_ShouldFollowFifoOrder()
        {
            // Arrange
            var queue = new BackgroundTaskQueue(10);
            var cancellationToken = new CancellationTokenSource(TimeSpan.FromSeconds(5)).Token;

            var item1 = new IncomingFileQueueItem
            {
                TrackingId = "TRK-001",
                BatchId = "BATCH-A",
                FileName = "CongVan1.pdf",
                UserId = Guid.NewGuid(),
                UserDepartment = "Phòng Hành chính - Tư pháp",
                FileBytes = new byte[] { 1, 2, 3 }
            };

            var item2 = new IncomingFileQueueItem
            {
                TrackingId = "TRK-002",
                BatchId = "BATCH-A",
                FileName = "ToTrinh2.docx",
                UserId = Guid.NewGuid(),
                UserDepartment = "Phòng Tài chính - Kế hoạch",
                FileBytes = new byte[] { 4, 5, 6 }
            };

            // Act
            await queue.EnqueueAsync(item1);
            await queue.EnqueueAsync(item2);

            var dequeued1 = await queue.DequeueAsync(cancellationToken);
            var dequeued2 = await queue.DequeueAsync(cancellationToken);

            // Assert
            Assert.Equal("TRK-001", dequeued1.TrackingId);
            Assert.Equal("CongVan1.pdf", dequeued1.FileName);
            Assert.Equal("TRK-002", dequeued2.TrackingId);
            Assert.Equal("ToTrinh2.docx", dequeued2.FileName);
        }

        [Fact]
        public async Task Enqueue_ShouldRegisterInitialStatusAsQueued()
        {
            // Arrange
            var queue = new BackgroundTaskQueue(10);
            var item = new IncomingFileQueueItem
            {
                TrackingId = "TRK-INIT-01",
                BatchId = "BATCH-01",
                FileName = "VanBanMoi.pdf",
                UserId = Guid.NewGuid(),
                UserDepartment = "UBND",
                FileBytes = Array.Empty<byte>()
            };

            // Act
            await queue.EnqueueAsync(item);
            var status = queue.GetTaskStatus("TRK-INIT-01");

            // Assert
            Assert.NotNull(status);
            Assert.Equal("TRK-INIT-01", status.TrackingId);
            Assert.Equal("VanBanMoi.pdf", status.FileName);
            Assert.Equal(QueueTaskStatus.Queued, status.Status);
            Assert.Null(status.ErrorMessage);
        }

        [Fact]
        public void UpdateTaskStatus_Completed_ShouldUpdateResultAndLogId()
        {
            // Arrange
            var queue = new BackgroundTaskQueue(10);
            string trackingId = "TRK-DONE-01";
            queue.RegisterTask(trackingId, "VanBanDone.pdf", "BATCH-01");

            var logId = Guid.NewGuid();
            var result = new ProcessIncomingResultDto
            {
                TaskId = "TASK-001",
                ProcessingLogId = logId,
                InitialDraftHtml = "<p>Dự thảo văn bản</p>"
            };

            // Act
            queue.UpdateTaskStatus(trackingId, QueueTaskStatus.Processing);
            var inProgress = queue.GetTaskStatus(trackingId);
            Assert.NotNull(inProgress);
            Assert.Equal(QueueTaskStatus.Processing, inProgress.Status);

            queue.UpdateTaskStatus(trackingId, QueueTaskStatus.Completed, null, logId, result);
            var completed = queue.GetTaskStatus(trackingId);

            // Assert
            Assert.NotNull(completed);
            Assert.Equal(QueueTaskStatus.Completed, completed.Status);
            Assert.Equal(logId, completed.ProcessingLogId);
            Assert.NotNull(completed.Result);
            Assert.Equal("<p>Dự thảo văn bản</p>", completed.Result.InitialDraftHtml);
        }

        [Fact]
        public void UpdateTaskStatus_Failed_ShouldRecordErrorMessage()
        {
            // Arrange
            var queue = new BackgroundTaskQueue(10);
            string trackingId = "TRK-FAIL-01";
            queue.RegisterTask(trackingId, "Corrupted.pdf", "BATCH-01");

            // Act
            queue.UpdateTaskStatus(trackingId, QueueTaskStatus.Failed, "Tệp tin PDF bị hỏng không thể OCR.");
            var status = queue.GetTaskStatus(trackingId);

            // Assert
            Assert.NotNull(status);
            Assert.Equal(QueueTaskStatus.Failed, status.Status);
            Assert.Equal("Tệp tin PDF bị hỏng không thể OCR.", status.ErrorMessage);
        }

        [Fact]
        public void GetTaskStatus_NonExistentTrackingId_ShouldReturnNull()
        {
            // Arrange
            var queue = new BackgroundTaskQueue(10);

            // Act
            var status = queue.GetTaskStatus("NON-EXISTENT-ID");

            // Assert
            Assert.Null(status);
        }
    }
}
