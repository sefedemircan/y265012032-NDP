-- Hastane/klinik randevu şeması.
-- İş kuralları uygulama sınıflarında durur; burada erişim ve bütünlük vardır.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.user_role as enum ('patient', 'doctor', 'health_personnel', 'clinic_manager');
create type public.facility_kind as enum ('hospital', 'clinic');
create type public.service_category as enum ('examination', 'diagnostic', 'laboratory');
create type public.appointment_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.facility_kind not null,
  parent_id uuid references public.facilities (id),
  created_at timestamptz not null default now(),
  constraint facilities_shape check (
    (kind = 'hospital' and parent_id is null) or kind = 'clinic'
  )
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.user_role not null default 'patient',
  specialty text,
  facility_id uuid references public.facilities (id),
  created_at timestamptz not null default now(),
  constraint profiles_role_shape check (
    (role = 'patient' and facility_id is null and specialty is null)
    or (role = 'doctor' and facility_id is not null and specialty is not null and length(trim(specialty)) > 0)
    or (role = 'health_personnel' and facility_id is not null)
    or (role = 'clinic_manager' and facility_id is not null and specialty is null)
  )
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name text not null
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  check (start_minute < end_minute)
);

create table public.medical_services (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null,
  category public.service_category not null,
  duration_minutes smallint not null check (duration_minutes > 0),
  fee_kurus integer not null check (fee_kurus >= 0)
);

create table public.staff_services (
  staff_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.medical_services (id) on delete cascade,
  primary key (staff_id, service_id)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  check (start_minute < end_minute)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id),
  staff_id uuid not null references public.profiles (id),
  facility_id uuid not null references public.facilities (id),
  organization_id uuid not null references public.facilities (id),
  service_id uuid not null references public.medical_services (id),
  service_name text not null,
  duration_minutes smallint not null check (duration_minutes > 0),
  fee_kurus integer not null check (fee_kurus >= 0),
  starts_at timestamptz not null,
  status public.appointment_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create index facilities_parent_id_idx on public.facilities (parent_id);
create index profiles_facility_id_idx on public.profiles (facility_id);
create index departments_facility_id_idx on public.departments (facility_id);
create index working_hours_facility_id_idx on public.working_hours (facility_id);
create index medical_services_department_id_idx on public.medical_services (department_id);
create index availability_slots_staff_id_idx on public.availability_slots (staff_id);
create index appointments_staff_starts_idx on public.appointments (staff_id, starts_at);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_facility_id_idx on public.appointments (facility_id);
create index appointments_organization_id_idx on public.appointments (organization_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Hasta'),
    coalesce(new.email, ''),
    'patient'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.manages_facility(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as manager
    where manager.id = auth.uid()
      and manager.role = 'clinic_manager'
      and target is not null
      and (
        manager.facility_id = target
        or exists (
          select 1
          from public.facilities as facility
          where facility.id = target
            and facility.parent_id = manager.facility_id
        )
      )
  );
$$;

create or replace function private.protect_appointment_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.patient_id is distinct from old.patient_id
    or new.staff_id is distinct from old.staff_id
    or new.facility_id is distinct from old.facility_id
    or new.organization_id is distinct from old.organization_id
    or new.service_id is distinct from old.service_id
    or new.service_name is distinct from old.service_name
    or new.duration_minutes is distinct from old.duration_minutes
    or new.fee_kurus is distinct from old.fee_kurus
    or new.starts_at is distinct from old.starts_at
  then
    raise exception 'Randevu kaydının ayrıntıları değiştirilemez';
  end if;
  return new;
end;
$$;

create trigger appointments_snapshot_guard
  before update on public.appointments
  for each row execute function private.protect_appointment_snapshot();

create or replace function private.staff_busy_intervals(
  target_staff uuid,
  day_start timestamptz,
  day_end timestamptz
)
returns table (starts_at timestamptz, duration_minutes smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select appointment.starts_at, appointment.duration_minutes
  from public.appointments as appointment
  where appointment.staff_id = target_staff
    and appointment.status in ('PENDING', 'APPROVED')
    and appointment.starts_at < day_end
    and appointment.starts_at + make_interval(mins => appointment.duration_minutes) > day_start
    and auth.uid() is not null;
$$;

create or replace function public.staff_busy_intervals(
  target_staff uuid,
  day_start timestamptz,
  day_end timestamptz
)
returns table (starts_at timestamptz, duration_minutes smallint)
language sql
stable
security invoker
set search_path = ''
as $$
  select starts_at, duration_minutes
  from private.staff_busy_intervals(target_staff, day_start, day_end);
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.manages_facility(uuid) to authenticated;
grant execute on function private.staff_busy_intervals(uuid, timestamptz, timestamptz) to authenticated;
revoke all on function public.staff_busy_intervals(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.staff_busy_intervals(uuid, timestamptz, timestamptz) to authenticated;

alter table public.facilities enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.working_hours enable row level security;
alter table public.medical_services enable row level security;
alter table public.staff_services enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments enable row level security;

revoke all on table
  public.facilities,
  public.profiles,
  public.departments,
  public.working_hours,
  public.medical_services,
  public.staff_services,
  public.availability_slots,
  public.appointments
from anon;

grant select, insert, update, delete on table
  public.facilities,
  public.profiles,
  public.departments,
  public.working_hours,
  public.medical_services,
  public.staff_services,
  public.availability_slots,
  public.appointments
to authenticated;

create policy facilities_select on public.facilities
for select to authenticated
using (true);

create policy facilities_insert on public.facilities
for insert to authenticated
with check (
  kind = 'clinic'
  and parent_id is not null
  and private.manages_facility(parent_id)
);

create policy facilities_update on public.facilities
for update to authenticated
using (private.manages_facility(id))
with check (private.manages_facility(id));

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or role in ('doctor', 'health_personnel')
  or private.manages_facility(facility_id)
  or exists (
    select 1
    from public.appointments as appointment
    where appointment.patient_id = profiles.id
      and (
        appointment.staff_id = auth.uid()
        or private.manages_facility(appointment.facility_id)
      )
  )
);

create policy departments_select on public.departments
for select to authenticated using (true);

create policy departments_write on public.departments
for insert to authenticated
with check (private.manages_facility(facility_id));

create policy departments_update on public.departments
for update to authenticated
using (private.manages_facility(facility_id))
with check (private.manages_facility(facility_id));

create policy departments_delete on public.departments
for delete to authenticated
using (private.manages_facility(facility_id));

create policy working_hours_select on public.working_hours
for select to authenticated using (true);

create policy working_hours_insert on public.working_hours
for insert to authenticated
with check (private.manages_facility(facility_id));

create policy working_hours_update on public.working_hours
for update to authenticated
using (private.manages_facility(facility_id))
with check (private.manages_facility(facility_id));

create policy working_hours_delete on public.working_hours
for delete to authenticated
using (private.manages_facility(facility_id));

create policy services_select on public.medical_services
for select to authenticated using (true);

create policy services_insert on public.medical_services
for insert to authenticated
with check (
  exists (
    select 1
    from public.departments as department
    where department.id = department_id
      and private.manages_facility(department.facility_id)
  )
);

create policy services_update on public.medical_services
for update to authenticated
using (
  exists (
    select 1
    from public.departments as department
    where department.id = department_id
      and private.manages_facility(department.facility_id)
  )
)
with check (
  exists (
    select 1
    from public.departments as department
    where department.id = department_id
      and private.manages_facility(department.facility_id)
  )
);

create policy services_delete on public.medical_services
for delete to authenticated
using (
  exists (
    select 1
    from public.departments as department
    where department.id = department_id
      and private.manages_facility(department.facility_id)
  )
);

create policy staff_services_select on public.staff_services
for select to authenticated using (true);

create policy staff_services_insert on public.staff_services
for insert to authenticated
with check (
  exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
);

create policy staff_services_delete on public.staff_services
for delete to authenticated
using (
  exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
);

create policy availability_select on public.availability_slots
for select to authenticated using (true);

create policy availability_insert on public.availability_slots
for insert to authenticated
with check (
  staff_id = auth.uid()
  or exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
);

create policy availability_update on public.availability_slots
for update to authenticated
using (
  staff_id = auth.uid()
  or exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
)
with check (
  staff_id = auth.uid()
  or exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
);

create policy availability_delete on public.availability_slots
for delete to authenticated
using (
  staff_id = auth.uid()
  or exists (
    select 1
    from public.profiles as staff
    where staff.id = staff_id
      and private.manages_facility(staff.facility_id)
  )
);

create policy appointments_select on public.appointments
for select to authenticated
using (
  patient_id = auth.uid()
  or staff_id = auth.uid()
  or private.manages_facility(facility_id)
);

create policy appointments_insert on public.appointments
for insert to authenticated
with check (
  patient_id = auth.uid()
  and status = 'PENDING'
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'patient'
  )
);

create policy appointments_patient_cancel on public.appointments
for update to authenticated
using (
  patient_id = auth.uid()
  and status in ('PENDING', 'APPROVED')
)
with check (
  patient_id = auth.uid()
  and status = 'CANCELLED'
);

create policy appointments_staff_decide on public.appointments
for update to authenticated
using (
  staff_id = auth.uid()
  and status = 'PENDING'
)
with check (
  staff_id = auth.uid()
  and status in ('APPROVED', 'REJECTED')
);

create policy appointments_manager_decide on public.appointments
for update to authenticated
using (
  private.manages_facility(facility_id)
  and status = 'PENDING'
)
with check (
  private.manages_facility(facility_id)
  and status in ('APPROVED', 'REJECTED')
);
