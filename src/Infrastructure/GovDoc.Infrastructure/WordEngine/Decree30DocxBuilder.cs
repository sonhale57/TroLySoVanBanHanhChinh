using System;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using GovDoc.Application.Common.Interfaces;

namespace GovDoc.Infrastructure.WordEngine
{
    public class Decree30DocxBuilder : IDocxBuilderService
    {
        public byte[] GenerateOfficialDispatch(OfficialDispatchDraftModel model)
        {
            return GenerateOfficialDispatch(
                model.IssuerParent,
                model.IssuerName,
                model.DocCode,
                model.Location,
                model.DocDateStr,
                model.SubjectTitle,
                model.RecipientMain,
                model.LegalBases?.ToArray() ?? Array.Empty<string>(),
                model.ContentParagraphs?.ToArray() ?? Array.Empty<string>(),
                model.RecipientsList?.ToArray() ?? Array.Empty<string>(),
                model.SignerTitle,
                model.SignerName
            );
        }

        public static byte[] GenerateOfficialDispatch(
            string issuerParent,
            string issuerName,
            string docCode,
            string location,
            string docDateStr,
            string subjectTitle,
            string recipientMain,
            string[] legalBases,
            string[] contentParagraphs,
            string[] recipientsList,
            string signerTitle,
            string signerName)
        {
            using var memoryStream = new MemoryStream();
            using (var wordDoc = WordprocessingDocument.Create(memoryStream, WordprocessingDocumentType.Document, true))
            {
                var mainPart = wordDoc.AddMainDocumentPart();
                mainPart.Document = new Document();
                var body = mainPart.Document.AppendChild(new Body());

                // CĂN LỀ A4 CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP (Top 20mm, Bottom 20mm, Left 30mm, Right 15mm)
                // 1 inch = 1440 dxa = 25.4 mm.
                // 20 mm = 1134 dxa
                // 30 mm = 1701 dxa
                // 15 mm = 850 dxa
                var sectionProps = new SectionProperties();
                var pageSize = new PageSize() { Width = 11906U, Height = 16838U }; // A4: 210 x 297 mm
                var pageMargin = new PageMargin()
                {
                    Top = 1134,
                    Bottom = 1134,
                    Left = 1701,
                    Right = 850
                };
                sectionProps.Append(pageSize);
                sectionProps.Append(pageMargin);

                // BẢNG TIÊU NGỮ 2 CỘT KHÔNG VIỀN (Chuẩn Nghị định 30)
                var headerTable = new Table();
                var tableProps = new TableProperties(
                    new TableWidth() { Type = TableWidthUnitValues.Dxa, Width = "9355" },
                    new TableBorders(
                        new TopBorder() { Val = BorderValues.None },
                        new LeftBorder() { Val = BorderValues.None },
                        new BottomBorder() { Val = BorderValues.None },
                        new RightBorder() { Val = BorderValues.None },
                        new InsideHorizontalBorder() { Val = BorderValues.None },
                        new InsideVerticalBorder() { Val = BorderValues.None }
                    )
                );
                headerTable.AppendChild(tableProps);

                var headerRow = new TableRow();
                var cellLeft = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4800" }));
                cellLeft.Append(CreateParagraph((issuerParent ?? "ỦY BAN NHÂN DÂN").ToUpper(), 12, false, false, JustificationValues.Center));
                cellLeft.Append(CreateParagraph((issuerName ?? "VĂN PHÒNG").ToUpper(), 12, true, false, JustificationValues.Center));
                cellLeft.Append(CreateParagraph($"Số: {docCode ?? "..../UBND-VP"}", 13, false, false, JustificationValues.Center));

                var cellRight = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4555" }));
                cellRight.Append(CreateParagraph("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", 12, true, false, JustificationValues.Center));
                cellRight.Append(CreateParagraph("Độc lập - Tự do - Hạnh phúc", 13, true, false, JustificationValues.Center));
                var locName = !string.IsNullOrWhiteSpace(location) ? location : "Địa danh";
                cellRight.Append(CreateParagraph($"{locName}, ngày {docDateStr ?? DateTime.Now.ToString("dd/MM/yyyy")}", 13, false, true, JustificationValues.Center));

                headerRow.Append(cellLeft);
                headerRow.Append(cellRight);
                headerTable.Append(headerRow);
                body.Append(headerTable);

                // TRÍCH YẾU
                body.Append(CreateParagraph($"V/v {subjectTitle ?? "xử lý văn bản"}", 13, true, false, JustificationValues.Center, 240, 240));

                // KÍNH GỬI
                body.Append(CreateParagraph($"Kính gửi: {recipientMain ?? "Cơ quan, đơn vị liên quan"}.", 14, true, false, JustificationValues.Left, 120, 120, 567));

                // CĂN CỨ PHÁP LÝ (Times New Roman 13pt, nghiêng, lùi đầu dòng)
                if (legalBases != null && legalBases.Length > 0)
                {
                    foreach (var legalBase in legalBases)
                    {
                        if (string.IsNullOrWhiteSpace(legalBase)) continue;
                        var text = legalBase.Trim().StartsWith("Căn cứ", StringComparison.OrdinalIgnoreCase) 
                            ? legalBase 
                            : $"Căn cứ {legalBase}";
                        if (!text.EndsWith(";")) text += ";";
                        body.Append(CreateParagraph(text, 13, false, true, JustificationValues.Both, 0, 60, 0, 720));
                    }
                }

                // NỘI DUNG VĂN BẢN (Times New Roman 14pt, đứng, giãn dòng 1.25cm đầu dòng)
                if (contentParagraphs != null && contentParagraphs.Length > 0)
                {
                    foreach (var content in contentParagraphs)
                    {
                        if (string.IsNullOrWhiteSpace(content)) continue;
                        body.Append(CreateParagraph(content, 14, false, false, JustificationValues.Both, 60, 120, 0, 720));
                    }
                }

                // CHÂN TRANG: NƠI NHẬN & CHỮ KÝ (BẢNG 2 CỘT KHÔNG VIỀN)
                var footerTable = new Table();
                footerTable.AppendChild(new TableProperties(
                    new TableWidth() { Type = TableWidthUnitValues.Dxa, Width = "9355" },
                    new TableBorders(
                        new TopBorder() { Val = BorderValues.None },
                        new LeftBorder() { Val = BorderValues.None },
                        new BottomBorder() { Val = BorderValues.None },
                        new RightBorder() { Val = BorderValues.None },
                        new InsideHorizontalBorder() { Val = BorderValues.None },
                        new InsideVerticalBorder() { Val = BorderValues.None }
                    )
                ));

                var footerRow = new TableRow();
                var cellRecipients = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4800" }));
                cellRecipients.Append(CreateParagraph("Nơi nhận:", 11, true, true, JustificationValues.Left));
                if (recipientsList != null && recipientsList.Length > 0)
                {
                    foreach (var rec in recipientsList)
                    {
                        if (string.IsNullOrWhiteSpace(rec)) continue;
                        var recText = rec.Trim().StartsWith("-") ? rec : $"- {rec};";
                        cellRecipients.Append(CreateParagraph(recText, 10, false, false, JustificationValues.Left));
                    }
                }
                else
                {
                    cellRecipients.Append(CreateParagraph("- Như trên;", 10, false, false, JustificationValues.Left));
                    cellRecipients.Append(CreateParagraph("- Lưu: VT, HS.", 10, false, false, JustificationValues.Left));
                }

                var cellSignature = new TableCell(new TableCellProperties(new TableCellWidth() { Type = TableWidthUnitValues.Dxa, Width = "4555" }));
                cellSignature.Append(CreateParagraph((signerTitle ?? "CHỦ TỊCH").ToUpper(), 13, true, false, JustificationValues.Center));
                // Khoảng trống chữ ký
                if (!string.IsNullOrWhiteSpace(signerName))
                {
                    cellSignature.Append(CreateParagraph(signerName, 14, true, false, JustificationValues.Center));
                }

                footerRow.Append(cellRecipients);
                footerRow.Append(cellSignature);
                footerTable.Append(footerRow);
                body.Append(footerTable);

                body.Append(sectionProps);
                mainPart.Document.Save();
            }

            return memoryStream.ToArray();
        }

        private static Paragraph CreateParagraph(
            string text,
            int fontSizePt,
            bool isBold = false,
            bool isItalic = false,
            JustificationValues? alignment = null,
            int spaceBeforeDxa = 0,
            int spaceAfterDxa = 0,
            int leftIndentDxa = 0,
            int firstLineIndentDxa = 0)
        {
            var p = new Paragraph();
            var pPr = new ParagraphProperties();

            pPr.Append(new Justification() { Val = alignment ?? JustificationValues.Left });
            pPr.Append(new SpacingBetweenLines() { Before = spaceBeforeDxa.ToString(), After = spaceAfterDxa.ToString(), Line = "276", LineRule = LineSpacingRuleValues.Auto });

            if (leftIndentDxa > 0 || firstLineIndentDxa > 0)
            {
                pPr.Append(new Indentation() { Left = leftIndentDxa.ToString(), FirstLine = firstLineIndentDxa.ToString() });
            }

            p.Append(pPr);

            var run = new Run();
            var rPr = new RunProperties();
            rPr.Append(new RunFonts() { Ascii = "Times New Roman", HighAnsi = "Times New Roman", ComplexScript = "Times New Roman" });
            rPr.Append(new FontSize() { Val = (fontSizePt * 2).ToString() });

            if (isBold) rPr.Append(new Bold());
            if (isItalic) rPr.Append(new Italic());

            run.Append(rPr);
            run.Append(new Text(text ?? string.Empty) { Space = SpaceProcessingModeValues.Preserve });
            p.Append(run);
            return p;
        }
    }
}
