import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Wordmark } from '@/components/layout/PageHeader'

export function PrivacyPolicy() {
  return (
    <div className="flex min-h-dvh justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-2xl">
        <Wordmark className="mb-1 text-3xl" />
        <p className="mb-6 text-ink-400">Privacybeleid</p>

        <Card className="flex flex-col gap-6 text-ink-700">
          <p className="text-sm font-semibold text-ink-400">Laatst bijgewerkt: 25 juli 2026</p>

          <p>
            Clubhuis is een besloten herinneringenboek voor een kleine, vertrouwde kring van
            familie en vrienden — geen open sociaal netwerk. Dit privacybeleid legt in gewone
            taal uit welke gegevens we bewaren, waarom, en wie ze kan zien.
          </p>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Welke gegevens verzamelen we</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Accountgegevens: e-mailadres, gebruikersnaam, weergavenaam en een versleuteld wachtwoord.</li>
              <li>
                Wat je zelf toevoegt: verhalen, foto's, krabbels, reacties, antwoorden op
                vriendenboekje-vragen, een statuszinnetje en je gekozen profielfoto.
              </li>
              <li>Wie je vrienden zijn en welke vriendschapsverzoeken open staan.</li>
              <li>Technische gegevens die nodig zijn om in te loggen en de app te laten werken, zoals je sessie.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Wie kan mijn gegevens zien</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Alleen mensen die je zelf als vriend hebt geaccepteerd zien verhalen die je met
                "vrienden" deelt; verhalen die je op "alleen voor mij" zet, ziet niemand anders.
              </li>
              <li>Nieuwe accounts worden pas actief nadat een beheerder ze heeft goedgekeurd — vreemden kunnen niet zomaar meedoen.</li>
              <li>
                Een beheerder (bijvoorbeeld een ouder) kan voor veiligheid en moderatie meekijken
                en, als dat nodig is, ongepaste content verwijderen of een account blokkeren.
              </li>
              <li>We verkopen, verhuren of delen je gegevens nooit met derden, en er wordt geen reclame getoond.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Waar bewaren we je gegevens</h2>
            <p>
              Je gegevens worden opgeslagen bij onze hostingpartner Supabase. Foto's staan in een
              beveiligde, niet-openbare opslag waar alleen jij, je vrienden (als je iets deelt) en
              beheerders bij kunnen.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Hoe lang bewaren we je gegevens</h2>
            <p>
              Zolang je account actief is, blijven je gegevens bewaard zodat je herinneringen niet
              verloren gaan. Een beheerder kan een account ook archiveren — dan blijft alles
              bewaard maar kun je tijdelijk niet inloggen — of definitief verwijderen. Bij
              verwijdering worden je profiel, verhalen, foto's, krabbels, reacties en
              vriendschappen blijvend gewist; dat is niet terug te draaien.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Jouw rechten</h2>
            <p>
              Je kunt op elk moment vragen om inzage in, aanpassing van, of verwijdering van je
              gegevens. Neem hiervoor contact op met de beheerder van jullie Clubhuis.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Cookies en volgen</h2>
            <p>
              Clubhuis gebruikt geen advertentiecookies en volgt je niet voor marketingdoeleinden.
              We gebruiken alleen technische opslag — zoals je inlogsessie — die nodig is om de
              app te laten werken.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-extrabold text-ink-900">Vragen</h2>
            <p>
              Heb je vragen over dit privacybeleid of over je eigen gegevens? Neem contact op met
              de beheerder van jullie Clubhuis.
            </p>
          </section>
        </Card>

        <p className="mt-4 text-center text-sm text-ink-400">
          <Link to="/inloggen" className="font-extrabold text-blue-500">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
