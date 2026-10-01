import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
export function Back() {
  return (
    <Link to="/requests" className="back-link">
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar para solicitações
    </Link>
  );
}
