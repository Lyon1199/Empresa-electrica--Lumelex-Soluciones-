<?php

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class QuotationSent extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Quotation $quotation,
        private string $pdfBytes,
        private string $pdfFileName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Cotización {$this->quotation->number} - Lumelex",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quotations.sent',
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfBytes, $this->pdfFileName)
                ->withMime('application/pdf'),
        ];
    }
}
