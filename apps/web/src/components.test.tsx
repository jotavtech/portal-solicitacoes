import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm, RequestForm } from './components/Forms.js';
import { DashboardCards, DeleteConfirmation } from './components/Shared.js';
import { ApiError } from './lib/api.js';

describe('SPEC-001 formulários', () => {
  it('AUTH-10 campos vazios impedem envio e têm labels', async () => {
    const submit = vi.fn();
    render(<LoginForm onSubmit={submit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entrar no portal' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Usuário')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  });
  it('AUTH-02/10 falha genérica preserva formulário e permite reenviar', async () => {
    const submit = vi.fn().mockRejectedValue(new ApiError(401, 'Usuário ou senha inválidos.'));
    render(<LoginForm onSubmit={submit} />);
    await userEvent.type(screen.getByLabelText('Usuário'), 'ana');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar no portal' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha inválidos.');
    expect(screen.getByLabelText('Usuário')).toHaveValue('ana');
    expect(screen.getByRole('button', { name: 'Entrar no portal' })).toBeEnabled();
  });
});

describe('SPEC-002 formulários e confirmação', () => {
  it('REQ-02 limites com erros associados e valores preservados', async () => {
    const submit = vi.fn();
    render(<RequestForm onSubmit={submit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Título'), 'ab');
    await userEvent.type(screen.getByLabelText('Descrição'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Criar solicitação' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Título')).toHaveValue('ab');
  });
  it('REQ-16 falha de rede não mostra sucesso nem perde conteúdo', async () => {
    const submit = vi
      .fn()
      .mockRejectedValue(new ApiError(0, 'Não foi possível conectar ao servidor.'));
    render(<RequestForm onSubmit={submit} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText('Título'), 'Notebook com problema');
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'A tela do notebook não está ligando.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Criar solicitação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar');
    expect(screen.getByLabelText('Descrição')).toHaveValue('A tela do notebook não está ligando.');
    expect(screen.getByRole('button', { name: 'Criar solicitação' })).toBeEnabled();
  });
  it('REQ-02 erros retornados pela API são apresentados por campo', async () => {
    render(
      <RequestForm
        onSubmit={vi
          .fn()
          .mockRejectedValue(
            new ApiError(422, 'Confira os campos.', { title: ['Título indisponível.'] }),
          )}
        initial={{
          title: 'Título válido',
          description: 'Descrição completa válida.',
          category: 'TI',
        }}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Título indisponível.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-describedby', 'title-error');
  });
  it('REQ-06 cancelar não exclui; confirmação explícita exclui', async () => {
    const confirm = vi.fn(),
      cancel = vi.fn();
    render(
      <DeleteConfirmation title="Notebook" onConfirm={confirm} onCancel={cancel} busy={false} />,
    );
    expect(screen.getByRole('dialog', { name: 'Excluir solicitação?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});

describe('SPEC-003 indicadores', () => {
  it('DASH-01 banco vazio mostra quatro zeros', () => {
    render(
      <DashboardCards
        data={{ total: 0, open: 0, inProgress: 0, completed: 0 }}
        loading={false}
        onRetry={() => {}}
      />,
    );
    expect(screen.getAllByText('0')).toHaveLength(4);
    expect(screen.getByText('Indicadores gerais')).toBeInTheDocument();
  });
  it('DASH-06 erro tem recuperação e não é mostrado como zeros', async () => {
    const retry = vi.fn();
    render(
      <DashboardCards loading={false} error="Falha ao carregar indicadores." onRetry={retry} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
