import { Card, CardDescription, CardTitle } from '@/components/ui/Card';

export default function Page() {
  return (
    <Card>
      <CardTitle>Configurações da barbearia</CardTitle>
      <CardDescription>
        Nome, endereço, telefone, Instagram, WhatsApp e regras de cancelamento. Esta tela já está posicionada na arquitetura do painel e deve receber os formulários de CRUD usando as mesmas validações e políticas RLS das migrations.
      </CardDescription>
    </Card>
  );
}
