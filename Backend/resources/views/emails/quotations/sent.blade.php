<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Cotización {{ $quotation->number }}</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;padding:32px">
        <div style="border-bottom:3px solid #f5b000;padding-bottom:16px">
            <strong style="font-size:22px;letter-spacing:2px">LUMELEX</strong>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Soluciones eléctricas e ingeniería</div>
        </div>
        <h1 style="font-size:21px;margin:24px 0 8px">Hola, {{ $quotation->customer_name }}</h1>
        <p style="line-height:1.6;color:#475569">
            Adjuntamos la cotización <strong>{{ $quotation->number }}</strong> para
            <strong>{{ $quotation->title }}</strong>.
        </p>
        <p style="line-height:1.6;color:#475569">
            Total: <strong>{{ $quotation->currency }} {{ number_format((float) $quotation->total, 2) }}</strong><br>
            Vigente hasta: <strong>{{ $quotation->valid_until->format('d/m/Y') }}</strong>
        </p>
        <p style="line-height:1.6;color:#475569">Encontrarás el documento PDF adjunto. Si tienes preguntas, responde a este correo.</p>
        <p style="margin-top:28px;color:#334155">Saludos,<br><strong>Equipo Lumelex</strong></p>
    </div>
</body>
</html>
