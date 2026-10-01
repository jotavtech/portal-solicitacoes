import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth.js';
import { useRequest } from '../lib/useRequest.js';
import { api } from '../lib/api.js';
import { Back } from '../components/Back.js';
import { RequestForm } from '../components/Forms.js';
import { Loading, ErrorPanel } from '../components/Shared.js';
export function NewPage() {
  const navigate = useNavigate();
  return (
    <div className="narrow-page">
      <Back />
      <div className="page-heading">
        <div>
          <span className="eyebrow">SOLICITAÇÕES / NOVA</span>
          <h1>Nova solicitação</h1>
          <p>Informe o assunto, a categoria e os detalhes para o atendimento.</p>
        </div>
      </div>
      <RequestForm
        onCancel={() => navigate('/requests')}
        onSubmit={async (input) => {
          const row = await api.create(input);
          navigate(`/requests/${row.id}`);
        }}
      />
    </div>
  );
}
export function EditPage() {
  const { id } = useParams(),
    { row, loading, error, retry } = useRequest(id),
    { session } = useAuth(),
    navigate = useNavigate();
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Back />
        <ErrorPanel message={error} onRetry={retry} />
      </>
    );
  if (!row) return null;
  if (row.status !== 'ABERTO' || row.requester.id !== session.user?.id)
    return (
      <>
        <Back />
        <ErrorPanel message="Somente o solicitante pode editar uma solicitação aberta." />
      </>
    );
  return (
    <div className="narrow-page">
      <Back />
      <div className="page-heading">
        <div>
          <span className="eyebrow">SOLICITAÇÕES / EDIÇÃO</span>
          <h1>Editar solicitação</h1>
          <p>Solicitação #{String(row.id).padStart(4, '0')}</p>
        </div>
      </div>
      <RequestForm
        key={row.id}
        initial={{ title: row.title, description: row.description, category: row.category }}
        onCancel={() => navigate(`/requests/${row.id}`)}
        onSubmit={async (input) => {
          await api.update(row.id, input);
          navigate(`/requests/${row.id}`);
        }}
      />
    </div>
  );
}
