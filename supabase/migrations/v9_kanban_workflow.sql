-- SDLC kanban columns on tasks (backlog → done)

alter table public.tasks add column if not exists kanban_column text;

update public.tasks
set kanban_column = case
  when status = 'done' then 'done'
  when status = 'in_progress' then 'in_progress'
  else 'todo'
end
where kanban_column is null;

alter table public.tasks alter column kanban_column set default 'todo';

alter table public.tasks drop constraint if exists tasks_kanban_column_check;
alter table public.tasks add constraint tasks_kanban_column_check
  check (kanban_column in ('backlog', 'todo', 'in_progress', 'review', 'done'));

create index if not exists tasks_kanban_column_idx on public.tasks(user_id, kanban_column);
