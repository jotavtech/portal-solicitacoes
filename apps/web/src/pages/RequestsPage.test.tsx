import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RequestsPage } from './RequestsPage.js';
import { api, ApiError } from '../lib/api.js';
import type { RequestPage } from '@portal/contracts';

const result: RequestPage = {
  page: 1,
  pageSize: 20,
  total: 1,
  items: [
    {
      id: 1,
      title: 'Notebook da equipe',
      description: 'Descrição válida completa.',
      category: 'TI',
      status: 'ABERTO',
      requester: { id: 1, username: 'ana', name: 'Ana' },
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-01T12:00:00.000Z',
    },
  ],
};
function mount() {
  return render(
    <MemoryRouter>
      <RequestsPage />
    </MemoryRouter>,
  );
}
afterEach(() => vi.restoreAllMocks());
describe('SPEC-002 listagem e filtros; SPEC-003 escopo', () => {
  it('REQ-10/DASH-04 filtros combinados e limpar; dashboard permanece global', async () => {
    const list = vi.spyOn(api, 'list').mockResolvedValue(result),
      dash = vi
        .spyOn(api, 'dashboard')
        .mockResolvedValue({ total: 8, open: 3, inProgress: 2, completed: 3 });
    mount();
    await screen.findByRole('link', { name: 'Notebook da equipe' });
    await userEvent.type(screen.getByLabelText('Buscar por título'), 'Notebook');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'TI');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'ABERTO');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(list.mock.calls[1][0].get('q')).toBe('Notebook');
    expect(list.mock.calls[1][0].get('category')).toBe('TI');
    expect(list.mock.calls[1][0].get('status')).toBe('ABERTO');
    expect(list.mock.calls[1][0].get('page')).toBe('1');
    expect(dash).toHaveBeenCalledOnce();
    expect(screen.getByText('8', { exact: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    expect(list.mock.calls[2][0].get('q')).toBeNull();
    expect(screen.getByLabelText('Buscar por título')).toHaveValue('');
    expect(dash).toHaveBeenCalledOnce();
  });
  it('REQ-16 falha da listagem tem recuperação', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue({
      total: 1,
      open: 1,
      inProgress: 0,
      completed: 0,
    });
    const list = vi
      .spyOn(api, 'list')
      .mockRejectedValueOnce(new ApiError(0, 'Falha de rede.'))
      .mockResolvedValue(result);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('link', { name: 'Notebook da equipe' });
    expect(list).toHaveBeenCalledTimes(2);
  });
  it('REQ-16 estado vazio é distinto de falha e loading', async () => {
    vi.spyOn(api, 'dashboard').mockResolvedValue({
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
    });
    vi.spyOn(api, 'list').mockResolvedValue({ ...result, total: 0, items: [] });
    mount();
    await screen.findByText('Nenhuma solicitação encontrada');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
