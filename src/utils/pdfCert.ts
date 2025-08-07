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






  // Save PDF
  const pdfBytes = await pdfDoc.save();
  if (options && options.returnBlob) {
    return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  } else {
    download(pdfBytes, `${participantName}_FUTUREX.AI_2025__Certificate.pdf`, 'application/pdf');
  }
}
