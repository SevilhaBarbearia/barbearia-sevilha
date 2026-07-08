import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { CompletarCadastroForm } from '@/components/forms/CompletarCadastroForm';
import { exigirPerfilCompleto } from '@/lib/auth/permissoes';

export default async function PerfilPage() {
  const { profile } = await exigirPerfilCompleto();

  return (
    <Card>
      <CardTitle>Meus dados de contato</CardTitle>
      <CardDescription>Atualize seus dados para a barbearia poder confirmar ou falar sobre sua reserva.</CardDescription>
      <div className="mt-8">
        <CompletarCadastroForm nome={profile.full_name} email={profile.email} />
      </div>
    </Card>
  );
}
