import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  createWorkspaceTask,
  listWorkspaceTasks,
  updateWorkspaceTask,
} from '../../api/workspace-task.api';
import type {
  WorkspaceTask,
  WorkspaceTaskPage,
} from '../../workspace-task.types';
import WorkspaceTasksPanel from './WorkspaceTasksPanel';

vi.mock('../../api/workspace-task.api', () => ({
  listWorkspaceTasks: vi.fn(),
  createWorkspaceTask: vi.fn(),
  updateWorkspaceTask: vi.fn(),
}));

const listTasksMock = vi.mocked(listWorkspaceTasks);
const createTaskMock = vi.mocked(createWorkspaceTask);
const updateTaskMock = vi.mocked(updateWorkspaceTask);

const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';

const CREATED_TASK = {
  id: '00000000-0000-4000-8000-000000000002',
  workspaceId: WORKSPACE_ID,
  createdById: '00000000-0000-4000-8000-000000000003',
  title: 'Ship',
  description: 'Details',
  status: 'todo',
  createdAt: '2026-11-19T00:00:00.000Z',
  updatedAt: '2026-11-19T00:00:00.000Z',
} satisfies WorkspaceTask;

const EMPTY_PAGE = {
  data: [],
  meta: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
} satisfies WorkspaceTaskPage;

const SAVED_PAGE = {
  data: [CREATED_TASK],
  meta: {
    ...EMPTY_PAGE.meta,
    total: 1,
    totalPages: 1,
  },
} satisfies WorkspaceTaskPage;

const dialogPrototype = HTMLDialogElement.prototype;

const originalShowModal = Object.getOwnPropertyDescriptor(
  dialogPrototype,
  'showModal'
);

const originalClose = Object.getOwnPropertyDescriptor(dialogPrototype, 'close');

beforeAll(() => {
  Object.defineProperties(dialogPrototype, {
    showModal: {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      writable: true,
      value(this: HTMLDialogElement) {
        this.open = false;
      },
    },
  });
});

afterAll(() => {
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor === undefined) {
      Reflect.deleteProperty(dialogPrototype, name);
    } else {
      Object.defineProperty(dialogPrototype, name, descriptor);
    }
  }
});

beforeEach(() => {
  listTasksMock
    .mockReset()
    .mockResolvedValueOnce(EMPTY_PAGE)
    .mockResolvedValue(SAVED_PAGE);

  createTaskMock.mockReset().mockResolvedValue(CREATED_TASK);
  updateTaskMock.mockReset();
});

async function renderAndOpenDialog() {
  const user = userEvent.setup();

  render(
    <WorkspaceTasksPanel
      workspaceId={WORKSPACE_ID}
      requesterId={CREATED_TASK.createdById}
      requesterRole="member"
    />,
    { reactStrictMode: false }
  );

  const newTaskButton = screen.getByRole('button', {
    name: 'New task',
  });

  await waitFor(() => {
    expect(newTaskButton).toBeEnabled();
  });

  await user.click(newTaskButton);

  const dialog = screen.getByRole('dialog', {
    name: 'Create a task',
  });

  return { user, dialog };
}

describe('WorkspaceTasksPanel', () => {
  it('creates a task, refreshes the list, and closes the dialog', async () => {
    const { user, dialog } = await renderAndOpenDialog();

    const titleInput = within(dialog).getByRole('textbox', {
      name: 'Title',
    });

    await user.type(titleInput, ' Ship ');

    await user.type(
      within(dialog).getByRole('textbox', {
        name: 'Description',
      }),
      ' Details '
    );

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Create task',
      })
    );

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Ship',
      })
    ).toBeInTheDocument();

    expect(createTaskMock).toHaveBeenCalledOnce();
    expect(createTaskMock).toHaveBeenCalledWith(WORKSPACE_ID, {
      title: 'Ship',
      description: 'Details',
    });

    expect(listTasksMock).toHaveBeenCalledTimes(2);
    expect(listTasksMock).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      { page: 1, pageSize: 10 },
      expect.any(AbortSignal)
    );

    await waitFor(() => {
      expect(dialog).not.toHaveAttribute('open');
      expect(titleInput).toHaveValue('');
    });
  });

  it('preserves the draft after failure and allows a successful retry', async () => {
    createTaskMock.mockRejectedValueOnce(new Error('Network unavailable'));

    const { user, dialog } = await renderAndOpenDialog();

    const titleInput = within(dialog).getByRole('textbox', {
      name: 'Title',
    });

    const descriptionInput = within(dialog).getByRole('textbox', {
      name: 'Description',
    });

    const saveButton = within(dialog).getByRole('button', {
      name: 'Create task',
    });

    await user.type(titleInput, 'Ship');
    await user.type(descriptionInput, 'Details');
    await user.click(saveButton);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Network unavailable'
    );

    expect(dialog).toHaveAttribute('open');
    expect(titleInput).toHaveValue('Ship');
    expect(descriptionInput).toHaveValue('Details');
    expect(listTasksMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    await user.click(saveButton);

    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'Ship',
      })
    ).toBeInTheDocument();

    expect(createTaskMock).toHaveBeenCalledTimes(2);
    expect(createTaskMock).toHaveBeenLastCalledWith(WORKSPACE_ID, {
      title: 'Ship',
      description: 'Details',
    });

    expect(listTasksMock).toHaveBeenCalledTimes(2);

    await waitFor(() => {
      expect(dialog).not.toHaveAttribute('open');
    });
  });

  it('blocks conflicting actions while a status update is pending', async () => {
    const user = userEvent.setup();

    listTasksMock.mockReset().mockResolvedValue({
      data: [
        CREATED_TASK,
        ...Array.from({ length: 9 }, (_, index) => ({
          ...CREATED_TASK,
          id: '00000000-0000-4000-8000-' + String(index + 10).padStart(12, '0'),
          title: `Other task ${index + 1}`,
        })),
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 11,
        totalPages: 2,
      },
    });

    let finishUpdate: ((task: WorkspaceTask) => void) | undefined;

    updateTaskMock.mockImplementationOnce(
      () =>
        new Promise<WorkspaceTask>((resolve) => {
          finishUpdate = resolve;
        })
    );

    render(
      <WorkspaceTasksPanel
        workspaceId={WORKSPACE_ID}
        requesterId={CREATED_TASK.createdById}
        requesterRole="member"
      />,
      { reactStrictMode: false }
    );

    const statusSelect = await screen.findByRole('combobox', {
      name: 'Status for Ship',
    });

    const refreshButton = screen.getByRole('button', {
      name: 'Refresh',
    });

    const newTaskButton = screen.getByRole('button', {
      name: 'New task',
    });

    const nextPageButton = screen.getByRole('button', {
      name: 'Next',
    });

    expect(nextPageButton).toBeEnabled();

    await user.selectOptions(statusSelect, 'in_progress');

    expect(statusSelect).toBeDisabled();
    expect(refreshButton).toBeDisabled();
    expect(newTaskButton).toBeDisabled();
    expect(nextPageButton).toBeDisabled();

    expect(updateTaskMock).toHaveBeenCalledWith(WORKSPACE_ID, CREATED_TASK.id, {
      status: 'in_progress',
    });

    if (finishUpdate === undefined) {
      throw new Error('Expected a pending status update');
    }

    const completeUpdate = finishUpdate;

    await act(async () => {
      completeUpdate({
        ...CREATED_TASK,
        status: 'in_progress',
      });
    });

    await waitFor(() => {
      expect(statusSelect).toHaveValue('in_progress');
      expect(statusSelect).toBeEnabled();
      expect(refreshButton).toBeEnabled();
      expect(newTaskButton).toBeEnabled();
      expect(nextPageButton).toBeEnabled();
    });

    expect(listTasksMock).toHaveBeenCalledOnce();
  });

  it('preserves an edit after failure and applies a successful retry', async () => {
    const user = userEvent.setup();

    listTasksMock.mockReset().mockResolvedValue(SAVED_PAGE);

    updateTaskMock
      .mockRejectedValueOnce(new Error('Task could not be saved'))
      .mockResolvedValue({
        ...CREATED_TASK,
        title: 'Revised task',
        description: null,
      });

    render(
      <WorkspaceTasksPanel
        workspaceId={WORKSPACE_ID}
        requesterId={CREATED_TASK.createdById}
        requesterRole="member"
      />,
      { reactStrictMode: false }
    );

    await user.click(await screen.findByRole('button', { name: 'Edit Ship' }));

    const dialog = screen.getByRole('dialog', { name: 'Edit task' });
    const titleInput = within(dialog).getByRole('textbox', {
      name: 'Title',
    });
    const descriptionInput = within(dialog).getByRole('textbox', {
      name: 'Description',
    });
    const saveButton = within(dialog).getByRole('button', {
      name: 'Save changes',
    });

    await user.clear(titleInput);
    await user.type(titleInput, '  Revised task  ');
    await user.clear(descriptionInput);
    await user.click(saveButton);

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Task could not be saved'
    );
    expect(dialog).toHaveAttribute('open');
    expect(titleInput).toHaveValue('  Revised task  ');
    expect(descriptionInput).toHaveValue('');

    await user.click(saveButton);

    expect(
      await screen.findByRole('heading', { name: 'Revised task' })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(dialog).not.toHaveAttribute('open');
    });

    expect(updateTaskMock).toHaveBeenCalledTimes(2);
    expect(updateTaskMock).toHaveBeenLastCalledWith(
      WORKSPACE_ID,
      CREATED_TASK.id,
      {
        title: 'Revised task',
        description: null,
      }
    );

    expect(
      screen.getByRole('combobox', { name: 'Status for Revised task' })
    ).toHaveValue('todo');
  });
});
