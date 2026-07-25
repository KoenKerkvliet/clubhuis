-- Bug: A kon een vriendschapsverzoek naar B sturen, en B kon (voordat ze het verzoek van A
-- had geaccepteerd/geweigerd) zelf ook nog een apart verzoek naar A sturen. De bestaande
-- unique constraint staat dat toe: die kijkt alleen naar (requester_id, addressee_id), en
-- (A,B) en (B,A) zijn daarvoor twee verschillende paren. Resultaat: twee losse
-- vriendschapsrijen tussen dezelfde twee mensen.
--
-- Een partial unique index op het ongeordende paar (least/greatest) voorkomt dit: zodra er
-- al een openstaand verzoek of geaccepteerde vriendschap tussen twee mensen bestaat, kan er
-- geen tweede rij (in welke richting dan ook) meer bijkomen. Na afwijzen of blokkeren mag
-- een nieuw verzoek nog wel, dus die statussen tellen bewust niet mee.
create unique index friendships_unique_unordered_active_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id))
  where status in ('pending', 'accepted');
