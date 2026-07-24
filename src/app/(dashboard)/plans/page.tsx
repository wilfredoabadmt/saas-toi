import { ServicePlanService } from '@/services/service-plan.service';
import { PlanManagerForm } from '@/components/domain/plan-manager-form';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const defaultOrgId = '00000000-0000-0000-0000-000000000001';
  const plans = await ServicePlanService.list(defaultOrgId);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', margin: 0 }}>
          Planes de Internet & Tarifario ISP
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0 0', fontSize: '0.92rem' }}>
          Configuración comercial de velocidades de bajada/subida, valores de tarifa mensual e integración con cobranza
        </p>
      </div>

      <PlanManagerForm initialPlans={plans} />
    </div>
  );
}
