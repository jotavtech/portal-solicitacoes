import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, user = 'ana') {
  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: 'Acessar o portal' })).toBeVisible();
  await page.getByLabel('Usuário', { exact: true }).fill(user);
  await page
    .getByLabel('Senha', { exact: true })
    .fill(user === 'ana' ? 'Ana-demo-2026!' : 'Bruno-demo-2026!');
  await page.getByRole('button', { name: 'Entrar no portal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Solicitações internas', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.stat-total strong')).toBeVisible();
}
async function create(page: Page, title: string) {
  await page.getByRole('link', { name: 'Nova solicitação', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Solicitação de teste: precisamos configurar a estação de trabalho.');
  await page.getByRole('button', { name: 'Criar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
test('AUTH-01/04/05 login, recarregar e logout', async ({ page }, info) => {
  await login(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Solicitações internas', exact: true }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText('password_hash');
  await page.screenshot({
    path: info.outputPath('dashboard.png'),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Sair do portal' }).click();
  await expect(page.getByRole('heading', { name: 'Acessar o portal' })).toBeVisible();
  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: 'Acessar o portal' })).toBeVisible();
  await page.screenshot({
    path: info.outputPath('login.png'),
    fullPage: true,
  });
});
test('REQ-01/03/07/08/10 e DASH-03 jornada completa', async ({ page }, info) => {
  await login(page);
  const before = Number(await page.locator('.stat-total strong').textContent());
  const title = `Estação da equipe ${info.project.name}`;
  await create(page, title);
  await page.getByRole('link', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill(`${title} revisada`);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: `${title} revisada`, exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para solicitações' }).click();
  await expect(page.locator('.stat-total strong')).toHaveText(String(before + 1));
  await page.getByLabel('Buscar por título').fill(`${title} revisada`);
  await page.getByLabel('Categoria', { exact: true }).selectOption('TI');
  await page.getByLabel('Status', { exact: true }).selectOption('ABERTO');
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.stat-total strong')).toHaveText(String(before + 1));
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('tbody tr')).not.toHaveCount(1);
  await expect(page.getByLabel('Buscar por título')).toHaveValue('');
  await page.getByLabel('Buscar por título').fill(`${title} revisada`);
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: `${title} revisada`, exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar atendimento' }).click();
  await expect(page.getByRole('button', { name: 'Concluir solicitação' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Concluir solicitação' }).click();
  await expect(page.getByText('Atendimento concluído', { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath('detail.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Voltar para solicitações' }).click();
  const values = await page.locator('.stat-card strong').allTextContents();
  expect(Number(values[0])).toBe(Number(values[1]) + Number(values[2]) + Number(values[3]));
});
test('REQ-06 cancelar e confirmar exclusão', async ({ page }, info) => {
  await login(page);
  await create(page, `Excluir com confirmação ${info.project.name}`);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: `Excluir com confirmação ${info.project.name}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(
    page.getByRole('heading', { name: 'Solicitações internas', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Buscar por título').fill(`Excluir com confirmação ${info.project.name}`);
  await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
  await expect(page.getByText('Nenhuma solicitação encontrada')).toBeVisible();
});
test('REQ-05 segundo colaborador consulta e atende sem editar conteúdo alheio', async ({
  page,
  browser,
}, info) => {
  await login(page);
  const title = `Compartilhada ${info.project.name}`;
  await create(page, title);
  const path = new URL(page.url()).pathname;
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: info.project.use.viewport,
  });
  try {
    const other = await context.newPage();
    await login(other, 'bruno');
    await other.goto(path);
    await expect(other.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(other.getByRole('link', { name: 'Editar', exact: true })).toHaveCount(0);
    await expect(other.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0);
    await other.getByRole('button', { name: 'Iniciar atendimento' }).click();
    await expect(other.getByRole('button', { name: 'Concluir solicitação' })).toBeVisible();
  } finally {
    await context.close();
  }
});
test('AUTH-03/05 sessão revogada leva ao login com aviso', async ({ page }) => {
  await login(page);
  const session = await (await page.request.get('/api/auth/session')).json();
  await page.request.post('/api/auth/logout', { headers: { 'X-CSRF-Token': session.csrfToken } });
  await page.getByRole('link', { name: 'Nova solicitação', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Tentativa após expiração');
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Não deve ser reenviada automaticamente depois do login.');
  await page.getByRole('button', { name: 'Criar solicitação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acessar o portal' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Sua sessão expirou');
});
test('REQ-12 conteúdo HTML é exibido como texto', async ({ page }, info) => {
  await login(page);
  const title = `<img src=x onerror=alert(1)> ${info.project.name}`;
  await create(page, title);
  await expect(page.locator('.main-content img')).toHaveCount(0);
  await page.getByRole('link', { name: 'Voltar para solicitações' }).click();
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
});
