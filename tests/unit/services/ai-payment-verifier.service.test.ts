import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/currency';
import { AiPaymentVerifierService } from '@/services/ai-payment-verifier.service';

describe('Currency Formatter Utility', () => {
  it('should format amounts in Bolivianos (Bs.) correctly', () => {
    expect(formatCurrency(250, 'BOB')).toContain('Bs.');
    expect(formatCurrency('150.50', 'BOB')).toContain('Bs.');
  });

  it('should format amounts in USD ($) correctly', () => {
    expect(formatCurrency(99, 'USD')).toContain('$');
  });

  it('should fallback gracefully for invalid or missing numbers', () => {
    expect(formatCurrency('invalid', 'BOB')).toBe('Bs. 0.00');
  });
});

describe('AiPaymentVerifierService Heuristics & OCR', () => {
  it('should extract Banco Unión, deposit amount and operation reference from caption text', () => {
    const text = 'Adjunto mi comprobante de depósito en Banco Unión por un monto de Bs. 250.00 con Nro. Operación 84920412';
    const result = AiPaymentVerifierService.extractDepositDetails(text);

    expect(result.extractedBank).toBe('Banco Unión');
    expect(result.extractedAmount).toBe('250.00');
    expect(result.extractedReference).toBe('84920412');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(70);
  });

  it('should detect BCP Bolivia transfers', () => {
    const text = 'Transferencia realizada desde BCP por $100 nro ref 948201';
    const result = AiPaymentVerifierService.extractDepositDetails(text);

    expect(result.extractedBank).toBe('BCP Bolivia');
    expect(result.extractedAmount).toBe('100');
    expect(result.extractedReference).toBe('948201');
  });
});
