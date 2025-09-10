from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal
import tempfile
import os

from ..models.payments import InvoiceLineItem
from .hebrew_utils import format_hebrew_currency, format_hebrew_date

class InvoicePDFGenerator:
    """
    מחולל PDF לחשבוניות - Invoice PDF generator with Hebrew/RTL support
    """
    
    def __init__(self):
        # Company details
        self.company_name = "OFAIR - עופאיר"
        self.company_address = "רחוב הטכנולוגיה 1, תל אביב"
        self.company_phone = "03-1234567"
        self.company_email = "billing@ofair.co.il"
        self.company_website = "www.ofair.co.il"
        self.vat_number = "123456789"
    
    async def generate_invoice_pdf(
        self,
        invoice_data: Dict[str, Any],
        line_items: List[InvoiceLineItem],
        professional_info: Dict[str, Any]
    ) -> bytes:
        """
        יצירת PDF חשבונית - Generate invoice PDF
        """
        try:
            # Try to import reportlab for PDF generation
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            
            # Register Hebrew font (would need actual font file in production)
            # For now, use default font
            
        except ImportError:
            # Fallback to simple text-based PDF
            return await self._generate_simple_text_pdf(
                invoice_data, line_items, professional_info
            )
        
        # Create temporary PDF file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            doc = SimpleDocTemplate(temp_file.name, pagesize=A4)
            
            # Build PDF content
            story = []
            styles = getSampleStyleSheet()
            
            # Hebrew/RTL style
            hebrew_style = ParagraphStyle(
                'Hebrew',
                parent=styles['Normal'],
                alignment=TA_RIGHT,
                fontSize=12,
                spaceAfter=6
            )
            
            title_style = ParagraphStyle(
                'HebrewTitle',
                parent=styles['Title'],
                alignment=TA_CENTER,
                fontSize=18,
                spaceAfter=20
            )
            
            # Company header
            story.append(Paragraph(f"<b>{self.company_name}</b>", title_style))
            story.append(Paragraph(f"{self.company_address}", hebrew_style))
            story.append(Paragraph(f"טלפון: {self.company_phone} | דוא\"ל: {self.company_email}", hebrew_style))
            story.append(Paragraph(f"ח.פ: {self.vat_number}", hebrew_style))
            story.append(Spacer(1, 1*cm))
            
            # Invoice title and details
            story.append(Paragraph(f"<b>חשבונית מספר: {invoice_data['invoice_number']}</b>", hebrew_style))
            story.append(Paragraph(f"תאריך הנפקה: {format_hebrew_date(invoice_data['issue_date'])}", hebrew_style))
            story.append(Paragraph(f"תאריך תשלום: {format_hebrew_date(invoice_data['due_date'])}", hebrew_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Professional details
            story.append(Paragraph("<b>חויב:</b>", hebrew_style))
            story.append(Paragraph(f"שם: {professional_info.get('name', 'לא זמין')}", hebrew_style))
            story.append(Paragraph(f"טלפון: {professional_info.get('phone_number', 'לא זמין')}", hebrew_style))
            story.append(Paragraph(f"מקצוע: {professional_info.get('profession', 'לא זמין')}", hebrew_style))
            story.append(Spacer(1, 1*cm))
            
            # Line items table
            table_data = [['תיאור', 'סכום']]
            
            for item in line_items:
                table_data.append([
                    item.description,
                    format_hebrew_currency(item.amount)
                ])
            
            # Add totals
            table_data.append(['', ''])  # Empty row
            table_data.append(['סכום ביניים:', format_hebrew_currency(invoice_data['subtotal'])])
            table_data.append([f'מע"ם ({float(invoice_data.get("vat_rate", 0.17))*100:.0f}%):', 
                              format_hebrew_currency(invoice_data['vat_amount'])])
            table_data.append(['<b>סה"כ לתשלום:</b>', 
                              f'<b>{format_hebrew_currency(invoice_data["total_amount"])}</b>'])
            
            # Create table
            table = Table(table_data, colWidths=[12*cm, 4*cm])
            table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, len(line_items)), colors.black),
                ('LINEBELOW', (0, len(line_items)+1), (-1, len(line_items)+1), 1, colors.black),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            
            story.append(table)
            story.append(Spacer(1, 1*cm))
            
            # Payment instructions
            story.append(Paragraph("<b>הוראות תשלום:</b>", hebrew_style))
            story.append(Paragraph("התשלום ייעשה באמצעות כרטיס אשראי או העברה בנקאית.", hebrew_style))
            story.append(Paragraph("למעבר לתשלום מקוון: www.ofair.co.il/payments", hebrew_style))
            story.append(Spacer(1, 0.5*cm))
            
            # Footer
            story.append(Paragraph("תודה על השירות ברשת OFAIR!", hebrew_style))
            
            # Build PDF
            doc.build(story)
            
            # Read PDF content
            with open(temp_file.name, 'rb') as pdf_file:
                pdf_content = pdf_file.read()
            
            # Clean up temp file
            os.unlink(temp_file.name)
            
            return pdf_content
    
    async def _generate_simple_text_pdf(
        self,
        invoice_data: Dict[str, Any],
        line_items: List[InvoiceLineItem],
        professional_info: Dict[str, Any]
    ) -> bytes:
        """
        Fallback simple text-based PDF generation
        """
        # Create a simple text representation
        content = f"""
        =================================
        {self.company_name}
        {self.company_address}
        טלפון: {self.company_phone}
        דוא"ל: {self.company_email}
        ח.פ: {self.vat_number}
        =================================
        
        חשבונית מספר: {invoice_data['invoice_number']}
        תאריך הנפקה: {format_hebrew_date(invoice_data['issue_date'])}
        תאריך תשלום: {format_hebrew_date(invoice_data['due_date'])}
        
        חויב:
        שם: {professional_info.get('name', 'לא זמין')}
        טלפון: {professional_info.get('phone_number', 'לא זמין')}
        מקצוע: {professional_info.get('profession', 'לא זמין')}
        
        ---------------------------------
        פירוט החשבונית:
        ---------------------------------
        """
        
        for item in line_items:
            content += f"{item.description}: {format_hebrew_currency(item.amount)}\n"
        
        content += f"""
        ---------------------------------
        סכום ביניים: {format_hebrew_currency(invoice_data['subtotal'])}
        מע"ם: {format_hebrew_currency(invoice_data['vat_amount'])}
        סה"כ לתשלום: {format_hebrew_currency(invoice_data['total_amount'])}
        
        הוראות תשלום:
        התשלום ייעשה באמצעות כרטיס אשראי או העברה בנקאית.
        למעבר לתשלום מקוון: www.ofair.co.il/payments
        
        תודה על השירות ברשת OFAIR!
        """
        
        # For a real implementation, would use a library like weasyprint
        # to convert HTML/text to PDF. For now, return the text as bytes
        return content.encode('utf-8')
    
    def generate_payment_receipt(
        self,
        payment_data: Dict[str, Any],
        invoice_data: Dict[str, Any]
    ) -> bytes:
        """
        יצירת קבלה על תשלום - Generate payment receipt
        """
        content = f"""
        =================================
        {self.company_name}
        קבלה על תשלום
        =================================
        
        מספר קבלה: {payment_data['id'][:8]}
        תאריך תשלום: {format_hebrew_date(payment_data['processed_at'])}
        
        פרטי התשלום:
        חשבונית מספר: {invoice_data['invoice_number']}
        סכום שולם: {format_hebrew_currency(payment_data['amount'])}
        אמצעי תשלום: {payment_data['payment_method']}
        מספר עסקה: {payment_data.get('gateway_transaction_id', 'לא זמין')}
        
        סטטוס: תשלום אושר
        
        תודה על התשלום!
        """
        
        return content.encode('utf-8')