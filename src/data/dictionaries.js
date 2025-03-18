export const dictionaries = [
    {
        dict: ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.'],
        threshold: 0.85,
        type: 'weekdays',
    },
    {
        dict: [
            'Arztzimmer', 'Hauptgebäude', 'GR', 'Matterhorn', 'Schulungsraum', 'ARTelier',
            'Auditorium_Go', 'Haupteingang', 'Ergotherapieraum', 'Fitnessraum', 'Sitzungszimmer',
            'Venus', 'Soz.-Dienstzimmer', 'TZ', '22', 'Eingangshalle', 'Küche'
          ],
        threshold: 0.85,
        type: 'locations',
    },
    {
        dict: [
            'Castano', 'Alicioglu', 'Berend', 'Butko', 'Günes',
            'Capaul', 'Jordi', 'Nied', 'Bütler', 'Sundberg', 'Amrein',
            'Autilio', 'Breit', 'Brömmer', 'Filippo', 'Koch',
            'Hierzer', 'Köse',  'Kusluk', 'Müller-Welti', 'Beer',
            'Guercio', 'Holenweg', 'Imboden', 'Mahendran', 'Scheumann',
            'Widmer', 'Mallien', 'Suter', 'Scheurmann', 'Friedli',
            'Baranowska', 'Germann', 'Oeggerli', 'Erni'
          ],
        threshold: 0.55,
        type: 'organizers',
    },
    {
        dict: [
            'Melden', 'bei', 'der', 'Pflege', 'Aktivierungsspaziergang', 'Selbstmanagement',
            'Eintrittsdiagnostik', 'Bedarfsvisite', 'Termin', 'Station', 'Mittagessen',
            'Gruppentherapie', 'Einzeltherapie', 'Forum', 'STAIR-AR', 'Einführung',
            'Psychoed.', 'Sucht', 'RPT', 'Einzel', 'Sozialdienst', 'Willkommensrunde',
            'Ergotherapie', 'S.T.A.R.K.', 'Erstgespräch', 'Aufnahme', 'Ärztl.',
            'Patientenadministration', 'Abendessen', 'mit', 'Götti', 'Sporttherapie',
            'Kunsttherapie', 'Themenzentriertes', 'Gestalten', 'Begleitung', 
            'Haushaltstraining', 'Cogpack', 'Küchenkleider', 'in', 'Wäscherei', 'abholen',
            'Ergo', 'Küche', 'Erholung', 'Natur', 'kreativer', 'Ausdruck',
            'Recoverygruppe'
          ],
        threshold: 0.8,
        type: 'expectedWords',
    }
];