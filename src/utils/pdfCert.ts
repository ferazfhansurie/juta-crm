import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import download from 'downloadjs';

// Event details mapping by date (add more as needed)
const EVENT_DETAILS: Record<string, { title: string; subtitle: string; date: string; venue: string; location: string }> = {
  '17 June 2025': {
    title: 'ROBOCONNECT 2025:\nInnovate. Integrate. Inspire.',
    subtitle: 'Smart Robotics in Action- From Code to Career',
    date: '17 June 2025',
    venue: 'Co9P Event Hall, Idea Tower 1, UPM-MTDC Technology Centre',
    location: 'Serdang Selangor',
  },
  '19 June 2025': {
    title: 'ROBOCONNECT 2025:\nInnovate. Integrate. Inspire.',
    subtitle: 'Bicara CEO: "AI Meets Robotics: Empowering the Next Generation of Intelligent Machines"',
    date: '19 June 2025',
    venue: 'Co9P Event Hall, Idea Tower 1, UPM-MTDC Technology Centre',
    location: 'Serdang Selangor',
  },
  '24 June 2025': {
    title: 'ROBOCONNECT 2025:\nInnovate. Integrate. Inspire.',
    subtitle: 'Robotics Technology Showcase & K-Youth Launching',
    date: '24 June 2025',
    venue: 'Co9P Event Hall, Idea Tower 1, UPM-MTDC Technology Centre',
    location: 'Serdang Selangor',
  },
  '26 June 2025': {
    title: 'ROBOCONNECT 2025:\nInnovate. Integrate. Inspire.',
    subtitle: 'Bicara CEO: "A UTM Alumni\'s Journey to Global Robotics"',
    date: '26 June 2025',
    venue: 'Co9P Event Hall, Idea Tower 1, UPM-MTDC Technology Centre',
    location: 'Serdang Selangor',
  },
};

// Helper to normalize date string to 'D Month YYYY' (e.g., '26/05/2025 09:00:00' -> '26 May 2025')
function normalizeDateToEventKey(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  // Try to match DD/MM/YYYY or D/M/YYYY at the start
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!match) return dateStr; // fallback to original if not matched
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = match[3];
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${day} ${monthNames[month]} ${year}`;
}

export async function generateCertificate(
  participantName: string,
  programDate?: string, // new argument
  options?: { returnBlob?: boolean }
): Promise<void | Blob> {
  // Load template
  // console.log(programDate);
  const response = await fetch('/certificates/cert.pdf');
  const existingPdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const [page] = pdfDoc.getPages();

  // Embed built-in fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // === Draw Participant Name (bold, centered) ===
  const pageSize = page.getSize();
  const nameFont = helveticaBold;
  const nameFontSize = 18;
  const nameWidth = nameFont.widthOfTextAtSize(participantName, nameFontSize);
  const contentX = 315; // left edge of content area
  const contentWidth = 500; // width of content area
  const nameX = contentX + (contentWidth - nameWidth) / 2;
  page.drawText(participantName, {
    x: nameX,
    y: 275,
    size: nameFontSize,
    font: nameFont,
    color: rgb(0, 0, 0),
  });

  // === Draw Event Details ===
  // Normalize date for lookup
  const normalizedDate = normalizeDateToEventKey(programDate);
  console.log(normalizedDate);
  console.log('EVENT_DETAILS' ,EVENT_DETAILS)
  const details = (normalizedDate && EVENT_DETAILS[normalizedDate]) || {
    title: 'Co9P Gen.AI Program Series 2025',
    subtitle: '',
    date: normalizedDate || programDate || '',
    venue: 'Co9P Event Hall, Idea Tower 1, UPM-MTDC Technology Centre',
    location: 'Serdang Selangor',
  };

  // Title (large font)
  page.drawText('ROBOCONNECT 2025', {
    x: 10,
    y:520,
    size: 25,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Innovate. Integrate. Inspire.', {
    x: 10,
    y:500,
    size: 18,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Connecting people, technology, and opportunity", {
    x: 15,
    y:100,
    size: 12,
    font: helvetica,
    color: rgb(1, 1, 1),
  });
  page.drawText("through robotics", {
    x: 15,
    y:85,
    size: 12,
    font: helvetica,
    color: rgb(1, 1, 1),
  });
  let subtitleY = 225;
  // Subtitle (medium font)
  if (details.subtitle) {
    // Helper to split text into lines that fit within a given width
    function splitTextToLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }

    const subtitleFont = helveticaBold;
    const subtitleFontSize = 14;
    const subtitleMaxWidth = 500; // Increased width for your layout

    const subtitleLineHeight = 18; // Adjust for spacing between lines
    let subtitleLines = splitTextToLines(details.subtitle, subtitleFont, subtitleFontSize, subtitleMaxWidth);
    if (subtitleLines.length > 3) {
      // Truncate to 3 lines and add ellipsis to the last line
      const firstTwo = subtitleLines.slice(0, 2);
      let lastLine = subtitleLines[2];
      // If there are more lines, append ellipsis to the last visible line
      for (let i = 3; i < subtitleLines.length; i++) {
        lastLine += ' ' + subtitleLines[i];
      }
      // Truncate lastLine to fit and add ellipsis
      while (subtitleFont.widthOfTextAtSize(lastLine + '...', subtitleFontSize) > subtitleMaxWidth && lastLine.length > 0) {
        lastLine = lastLine.slice(0, -1);
      }
      lastLine = lastLine.trim() + '...';
      subtitleLines = [...firstTwo, lastLine];
    }
    // Center each subtitle line within the content area (like participant name)
    const subtitleContentX = 315; // left edge of content area (same as participant name)
    const subtitleContentWidth = 500; // width of content area (same as participant name)
    for (const line of subtitleLines) {
      const lineWidth = subtitleFont.widthOfTextAtSize(line, subtitleFontSize);
      const lineX = subtitleContentX + (subtitleContentWidth - lineWidth) / 2;
      page.drawText(line, {
        x: lineX,
        y: subtitleY,
        size: subtitleFontSize,
        font: subtitleFont,
        color: rgb(0, 0, 0),
      });
      subtitleY -= subtitleLineHeight;
    }
    // Add extra space if subtitle is 2 or more lines
    if (subtitleLines.length < 2) {
      subtitleY -= 8; // You can adjust this value for more/less space
    }
  }

  // Date (medium font)
  if (details.date) {
    page.drawText(details.date, {
      x: 520,
      y: subtitleY,
      size: 14,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
  }

  // Venue (small font)
  page.drawText(details.venue, {
    x: 395,
    y: 172,
    size: 12,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Location (small font)
  page.drawText(details.location, {
    x: 520,
    y: 162,
    size: 12,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Save PDF
  const pdfBytes = await pdfDoc.save();
  if (options && options.returnBlob) {
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  } else {
    download(pdfBytes, `${participantName}_ROBOCONNECT_2025_Certificate.pdf`, 'application/pdf');
  }
}
