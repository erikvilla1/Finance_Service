-- =============================================================================
-- 0023 — STATES BECOME A LIST, PHONES AND ZIPS GET A SHAPE
--
-- Three fields were accepting anything at all:
--
--   State                free text. "ca", "Cali", "California", "CA " are four
--                        different states as far as any grouping or lender
--                        export is concerned.
--   Phone                free text with no length. Fifteen digits, twenty, a
--                        sentence — all accepted, all printed on the funding
--                        application exactly as typed.
--   ZIP                  free text. Same.
--
-- None of this is cosmetic. These values go onto a document that goes to a
-- lender. A malformed phone number on a funding application is a deal that
-- stalls because nobody could reach the applicant, and the person who typed it
-- has no idea anything is wrong.
--
-- The fix belongs here rather than in the form, because spec §9 puts question
-- configuration in the database: type, options, and validation are data. The
-- form reads them and enforces what it is told. Adding the next validated field
-- is an insert, not a deploy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. STATE BECOMES A SELECT
--
-- Two-letter USPS codes as the stored value, full names as the label. The code
-- is what a lender package and every downstream system expects; the full name
-- is what someone scanning a dropdown on a phone can actually find.
-- -----------------------------------------------------------------------------

update public.application_questions
   set question_type = 'select',
       help_text = coalesce(help_text, null)
 where key in (
   'business_state',
   'business_state_of_incorporation',
   'owner_home_state'
 );

-- Idempotent: re-running replaces the list rather than doubling it.
delete from public.question_options
 where question_id in (
   select id from public.application_questions
    where key in ('business_state', 'business_state_of_incorporation', 'owner_home_state')
 );

insert into public.question_options (question_id, value, label, sort_order)
select q.id, s.code, s.name, s.ord
  from public.application_questions q
  cross join (
    values
      ('AL','Alabama',1),('AK','Alaska',2),('AZ','Arizona',3),('AR','Arkansas',4),
      ('CA','California',5),('CO','Colorado',6),('CT','Connecticut',7),('DE','Delaware',8),
      ('DC','District of Columbia',9),('FL','Florida',10),('GA','Georgia',11),('HI','Hawaii',12),
      ('ID','Idaho',13),('IL','Illinois',14),('IN','Indiana',15),('IA','Iowa',16),
      ('KS','Kansas',17),('KY','Kentucky',18),('LA','Louisiana',19),('ME','Maine',20),
      ('MD','Maryland',21),('MA','Massachusetts',22),('MI','Michigan',23),('MN','Minnesota',24),
      ('MS','Mississippi',25),('MO','Missouri',26),('MT','Montana',27),('NE','Nebraska',28),
      ('NV','Nevada',29),('NH','New Hampshire',30),('NJ','New Jersey',31),('NM','New Mexico',32),
      ('NY','New York',33),('NC','North Carolina',34),('ND','North Dakota',35),('OH','Ohio',36),
      ('OK','Oklahoma',37),('OR','Oregon',38),('PA','Pennsylvania',39),('RI','Rhode Island',40),
      ('SC','South Carolina',41),('SD','South Dakota',42),('TN','Tennessee',43),('TX','Texas',44),
      ('UT','Utah',45),('VT','Vermont',46),('VA','Virginia',47),('WA','Washington',48),
      ('WV','West Virginia',49),('WI','Wisconsin',50),('WY','Wyoming',51),
      -- Territories. Rare, but a business in San Juan is a real business and a
      -- dropdown that cannot express where it is forces someone to lie.
      ('PR','Puerto Rico',52),('VI','U.S. Virgin Islands',53),('GU','Guam',54)
  ) as s(code, name, ord)
 where q.key in ('business_state', 'business_state_of_incorporation', 'owner_home_state');

-- -----------------------------------------------------------------------------
-- 2. PHONES AND ZIPS GET A PATTERN
--
-- The patterns are deliberately forgiving about punctuation and strict about
-- digits. People type (310) 555-1234, 310.555.1234, and 3105551234, and all
-- three are the same phone number; rejecting two of them teaches someone that
-- the form is broken. What is not negotiable is ten digits.
--
-- `max` is the maximum input length, which is what stops the twenty-digit case
-- at the point of typing rather than at the point of printing.
--
-- These are enforced twice on purpose: the browser applies them for immediate
-- feedback, and the save path applies them again because a pattern attribute is
-- a suggestion to anyone willing to open devtools.
-- -----------------------------------------------------------------------------

update public.application_questions
   set validation = jsonb_build_object(
         'pattern', '^(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$',
         'max', 20
       ),
       placeholder = coalesce(placeholder, '(310) 555-1234'),
       help_text = coalesce(help_text, 'A 10-digit US number.')
 where question_type = 'phone'
   and is_active;

update public.application_questions
   set validation = jsonb_build_object('pattern', '^\d{5}(-\d{4})?$', 'max', 10),
       placeholder = coalesce(placeholder, '90001')
 where key in ('business_postal_code', 'owner_home_postal_code');

-- -----------------------------------------------------------------------------
-- 3. BRING EXISTING VALUES INTO LINE
--
-- Anything already captured as free text has to match an option value or the
-- dropdown renders empty and the applicant is told, wrongly, that they never
-- answered. Two-letter values are upper-cased; full state names are translated.
-- Anything else is left alone rather than guessed at — a wrong state on a
-- funding application is worse than a blank one, because nobody checks it.
-- -----------------------------------------------------------------------------

create temporary table state_lookup (code text primary key, name text) on commit drop;

insert into state_lookup (code, name)
select o.value, o.label
  from public.question_options o
  join public.application_questions q on q.id = o.question_id
 where q.key = 'business_state';

update public.businesses b
   set state = upper(b.state)
 where b.state is not null
   and length(trim(b.state)) = 2
   and upper(trim(b.state)) in (select code from state_lookup);

update public.businesses b
   set state = l.code
  from state_lookup l
 where b.state is not null
   and lower(trim(b.state)) = lower(l.name);

update public.businesses b
   set state_of_incorporation = upper(b.state_of_incorporation)
 where b.state_of_incorporation is not null
   and length(trim(b.state_of_incorporation)) = 2
   and upper(trim(b.state_of_incorporation)) in (select code from state_lookup);

update public.businesses b
   set state_of_incorporation = l.code
  from state_lookup l
 where b.state_of_incorporation is not null
   and lower(trim(b.state_of_incorporation)) = lower(l.name);

update public.application_owners o
   set home_state = upper(o.home_state)
 where o.home_state is not null
   and length(trim(o.home_state)) = 2
   and upper(trim(o.home_state)) in (select code from state_lookup);

update public.application_owners o
   set home_state = l.code
  from state_lookup l
 where o.home_state is not null
   and lower(trim(o.home_state)) = lower(l.name);
