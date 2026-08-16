-- -----------------------------------------------------------------------------
-- Rename the revenue-based product to "Working Capital".
--
-- WHY A MIGRATION AND NOT AN EDIT TO 0006. Migration files are a record of what
-- has already been applied. Editing the seed would leave every environment that
-- has run it — including production — showing the old name while the file
-- claims otherwise, and would make the two disagree with no way to tell which
-- ran. New change, new file.
--
-- THE SLUG DOES NOT MOVE. `revenue-based-financing` is referenced by the
-- qualification ruleset, by qualification_results rows already written, and by
-- the product_slug on every stored match. Renaming the slug would orphan all of
-- them; the display name is the only thing an applicant sees.
--
-- WORTH FLAGGING TO ROBERT: "Working Capital" is a broader term than
-- revenue-based financing, and the catalog already uses working_capital as this
-- product's TRACK — so the product and its category now read the same. That is
-- fine on a results page, where the applicant is choosing between named
-- options, but it is worth confirming he does not mean this to cover term loans
-- and lines of credit as well, which are separate rows.
--
-- The tagline and description below still describe advance structures sized
-- against monthly volume. They were left alone: renaming a product is a label
-- change, rewriting what it does is a product change, and the second one needs
-- his sign-off rather than mine.
-- -----------------------------------------------------------------------------

update public.financing_products
   set name = 'Working Capital'
 where slug = 'revenue-based-financing';
