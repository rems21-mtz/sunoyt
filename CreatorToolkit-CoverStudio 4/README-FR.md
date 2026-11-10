# Creator Toolkit V4.3.4 — Cover Studio, sans PIN

Extension Chrome pour préparer une cover/remix Suno à partir d'une vidéo
YouTube ou d'un fichier audio : paroles, phonétique, style et upload dégradé
automatique.

## Installation

1. Décompresser `CreatorToolkit-V4.3.4-CoverStudio.zip`.
2. Ouvrir `chrome://extensions`, activer **Mode développeur**.
3. **Charger l'extension non empaquetée** et choisir le dossier
   `CreatorToolkit-CoverStudio`.
4. Épingler l'icône : elle ouvre directement **Cover Studio**.
5. Se connecter à suno.com dans le même profil Chrome.

Il n'y a plus de barre latérale. Le moteur d'upload tourne dans un cadre caché
dans Cover Studio.

## Workflow

### 1. Source

- URL YouTube ou **Importer un fichier** (MP3, WAV, M4A, FLAC, OGG, AAC, WebM).
- **Scanner** capture 30 s (YouTube, en sourdine) ou analyse le fichier.
- L'extrait final est limité à 59 s.

### 2. Style & voix

- Style libre, **Générer le prompt** (IA si un endpoint Songwriter est déjà
  configuré, sinon générateur local).
- **Tonalité** et **progression d'accords** : récupérées sur internet via
  **Hooktheory** (tonalité + accords) puis **SongBPM** (tonalité en secours).
  Les deux champs restent éditables ; la progression Hooktheory est en chiffres
  romains (ex. `i – ii42 – i7 – ii42`).
- Le prompt de style inclut automatiquement la tonalité et la progression
  (`key of F# minor, chord progression i – ...`) et part vers Suno.
- Une carte **Progression par phrase** répartit les accords des sections
  Hooktheory sur chaque ligne de paroles. La grille est copiable et reste
  indicative (les accords se répètent, la répartition est approximative).
- Bouton **Phonétique + accords** : les accords sont insérés directement dans
  la zone **Phonétique simplifiée**, la partie copiée et envoyée à Suno.
  Résumé de progression après chaque section et un accord sur chaque ligne.
  Les boutons Copier la phonétique, Remplir Suno et l'automatique utilisent
  cette version.
- Une carte **Stems** sépare avec Demucs :
  - par défaut le **morceau généré** importé (MP3/WAV téléchargé depuis Suno) ;
  - ou l'**extrait source**.
  Instrumental + acapella, ou tous les stems (drums, bass, other, vocals),
  dans un ZIP de WAV. Le premier lancement charge le modèle local (~289 Mo).
- Voix **Male / Female**, variantes existantes et suggestions selon le style.
- **Scanner la vidéo / le morceau** relance l'analyse.

### 3. Extrait & validation

- Choisir le **Mode** avant de valider :
  - **Dégrader** : profils Subtle → Aggressive → Instrumental ;
  - **Ralentir 50 %** : le passage est ralenti de moitié, sans ré-encodage
    MP3 ni EQ. L'extrait source est alors limité à 29 s pour produire un WAV
    d'environ 58 s.
- Vérifier le découpage, écouter, puis **Accepter le découpage et valider
  l'extrait**.
- Récupération des paroles + phonétique, copie des paroles puis du prompt.
- L'automatique teste le mode choisi dans le moteur caché, sans ouvrir Suno.
  En mode **Dégrader**, il commence directement par **Aggressive**
  (Subtle n'est plus utilisé automatiquement : il était refusé et trop peu
  audible), puis Instrumental.
  En mode **Ralentir 50 %**, un seul profil est testé : le WAV ralenti,
  sans dégradation de qualité.
- **Suno Create ne s'ouvre qu'après acceptation**, puis : import du sample,
  **Remix > Cover**, injection paroles/style, réglages **Weirdness 0 /
  Style 100 / Variety Off** (best-effort).
- En mode Dégrader, les pastilles **Off / Subtle / Aggressive /
  Instrumental** sont cliquables : elles activent ou désactivent chaque profil
  testé. Par défaut Aggressive + Instrumental ; clique sur Off ou Subtle pour
  les ajouter. Off envoie l'original.

## Téléchargements des samples

Trois fichiers distincts :

- **extrait original** : le MP3 de travail, non dégradé ;
- **sample dégradé accepté** : le fichier exact du profil validé, nommé
  `… - Subtle - dégradé.mp3/wav`, disponible après acceptation ;
- **samples testés** : chaque fichier traitement envoyé à Suno est conservé
  pendant la session. Le dernier refusé est automatiquement téléchargé dans
  `Téléchargements` ; le sélecteur **Samples testés** permet de télécharger
  séparément Subtle, Aggressive, Instrumental ou Off avec leur statut
  (accepté / refusé / en pause). Le nom contient `- testé`.

Le fichier réellement envoyé n'est donc plus uniquement en mémoire : on peut
l'écouter pour diagnostiquer un refus Suno.

## Dégradation

- **Aggressive (minimum automatique)** : pitch −5 demi-tons, tempo ×0,90,
  reverb 20 %, EQ notch 300 Hz + tilt 3 dB, jitter 18/14 cents, peak-smear
  7 bandes, MP3 64 kbps VBR, lyric bypass, 48 kHz ;
- **Instrumental** : séparation Demucs hard, pitch −2, tempo ×0,95, 48 kHz,
  MP3 96 kbps ;
- **Subtle** reste disponible techniquement mais n'est plus lancé
  automatiquement ;
- un upload accepté mais muet pour copyright est traité comme un refus.

## Limites

- Suno peut changer son interface : l'import Audio File, Remix > Cover et les
  curseurs restent best-effort ; un message indique quoi finir à la main.
- Genius peut demander une vérification Cloudflare ; LRCLIB/lyrics.ovh en
  secours.
- Le mode local (séparation vocale) peut être long au premier lancement.
- La fonction Modèles n'est plus exposée dans l'interface.

## Historique

### 4.3.4

- Le statut d'échec de l'automatique affiche désormais la dernière erreur
  Suno exacte, en plus du nom des profils testés.

### 4.3.3

- Le prompt de style ne contient plus « faithful », ni la tonalité, ni le
  tempo/BPM. La tonalité reste utilisée pour convertir les accords, jamais
  dans le prompt. Les accords restent inclus.
- L'IA de prompt reçoit l'interdiction de citer artiste, titre, tonalité,
  tempo ou « faithful ».
- Libellé « Cover proche de l'original ».

### 4.3.2

- Le bloc **Extrait & validation** est déplacé juste avant **Envoyer vers
  Suno**. Ordre : Source → Style & voix → Paroles → Progression → Stems →
  Extrait & validation → Envoyer vers Suno.
- Le texte d'aide du scan renvoie vers ce bloc final.

### 4.3.1

- Le prompt de style ne contient plus le nom de l'artiste ni le titre :
  Suno les refuse et remplace le prompt par des tags similaires.
- Référence neutre « faithful cover of the uploaded song » ; la tonalité,
  le tempo, les accords et le style sont conservés.
- L'IA de génération de prompt reçoit la consigne de ne jamais citer
  d'artiste ou de titre.
- Le titre et l'artiste restent utilisés uniquement pour la recherche de
  paroles et d'accords, jamais dans le prompt Suno.

### 4.3.0

- Mode **Cover fidèle à l'original** (activé par défaut) : le prompt de style
  exige une cover fidèle et la conservation de la mélodie, du phrasé, de la
  tonalité, du tempo et des accords ; le style devient une direction de
  production.
- Profils par défaut **Subtle + Instrumental** (pitch et tempo préservés) au
  lieu d'Aggressive. Aggressive reste cliquable mais transpose/ralentit.
- Analyse de l'exemple Hey Jude : le sample dégradé faisait 29 s à ~65 BPM,
  le résultat Suno 5:04 à ~66 BPM ; l'original est ~74 BPM. Le profil
  Aggressive (×0,90) et le style Tech house expliquaient l'éloignement.
- Le prompt inclut le titre/artiste d'origine, la tonalité, le tempo détecté
  et les accords.

### 4.2.0

- Profils Off et Subtle réactivés : pastilles cliquables, désactivées par
  défaut mais activables ; l'automatique utilise la sélection.
- Accords optionnels : import, copie, remplissage Suno, validation et
  automatique fonctionnent avec la phonétique sans accords.
- L'export reste limité à la phonétique (pas de retour aux paroles
  originales).

### 4.1.0

- Après génération sur Suno, bouton « Récupérer mes derniers morceaux
  Suno » dans Stems : liste des 20 derniers morceaux, choix du morceau,
  écoute/séparation optionnelle, stems en local (ZIP).
- L'audio du morceau Suno est récupéré puis décodé ; import du fichier
  téléchargé en secours si la liste ou l'audio n'est pas accessible.
- La séparation n'est jamais automatique : l'utilisateur choisit de la
  lancer ou non après la génération.

### 4.0.0

- Séparation des stems sur le **morceau généré** : import du MP3/WAV
  téléchargé depuis Suno, décodage complet et séparation Demucs sur toute la
  piste. L'extrait source reste une option.
- Source « Morceau généré importé » par défaut ; nom de fichier et ZIP basés
  sur ce morceau.

### 3.9.1

- Seul l'export **lyrics phonétiques + accords** est conservé : le bouton
  Copier des paroles originales et le bouton Copier la grille d'accords sont
  retirés.
- Copier la phonétique, Remplir Suno, la validation et l'automatique exigent
  la phonétique avec accords et n'utilisent jamais l'original en secours.
- Le prompt de style et les stems restent des exports séparés, hors paroles.

### 3.9.0

- Les accords sont maintenant dans la zone **Phonétique simplifiée**, la
  partie copiée/envoyée à Suno (plus de champ séparé).
- Bouton « Phonétique + accords » ; génère la phonétique si elle manque ou
  si le texte n'est pas phonétique, puis insère les accords réels.
- Copier la phonétique, Remplir Suno et l'automatique utilisent cette zone.
- Le texte est idempotent : les anciennes annotations sont retirées avant
  reconstruction, et les accords déjà édités ne sont pas écrasés par l'auto.

### 3.8.0

- Ajout des paroles avec accords dans le prompt des paroles : résumé de la
  progression par section et accord sur chaque phrase.
- Accords convertis en noms réels à partir de la tonalité (ex. F#m, G#m7/F#)
  et repris dans le texte injecté dans Suno.
- Base original ou phonétique, case « Utiliser pour Suno », copie et
  remplissage Suno dédiés.
- La conversion phonétique locale/IA préserve les annotations d'accords.

### 3.7.0

- Grille d'accords phrase par phrase à partir des sections Hooktheory.
- Export des stems Demucs : instrumental + acapella ou tous les stems,
  dans un ZIP de WAV.
- Le worker de séparation reçoit les canaux audio bruts (plus de blocage
  lié à l'hôte audio).
- Testé : 5 stems produits pour un extrait de 16 s, ZIP valide.

### 3.6.0

- Ajout de la tonalité et de la progression d'accords à l'étape Style.
- Récupération automatique sur Hooktheory (clé + progression) et SongBPM
  (clé de secours), champs éditables.
- Le prompt de style inclut la tonalité et la progression.
- Permissions d'hôte ajoutées pour hooktheory.com et songbpm.com.

### 3.5.4

- Dégradation Aggressive renforcée : pitch −5, tempo ×0,90, reverb, EQ
  notch/tilt, jitter, peak-smear et MP3 64 kbps. Test : 30 s source →
  33,66 s WAV 48 kHz, centroïde spectral 3230 Hz contre 4827 Hz pour
  l'ancien Aggressive.
- L'automatique commence à Aggressive ; Subtle n'est plus lancé (refusé et
  trop discret). Instrumental renforcé (pitch −2, tempo ×0,95).
- Extrait source plafonné à 53 s pour que la sortie Aggressive reste sous
  1 minute.

### 3.5.3

- Correction critique : le cadre caché du moteur d'upload utilisait une URL
  absolue avec l'ancien ID d'extension. Il utilise maintenant
  `sidepanel.html` en relatif, donc il fonctionne quel que soit l'ID ou le
  dossier de l'extension.
- C'est la cause du message « Le moteur d'upload intégré ne répond pas ».

### 3.5.2

- La capture YouTube active l'onglet pendant l'enregistrement : Chrome
  ralentit les timers des onglets en arrière-plan, ce qui faisait démarrer la
  vidéo sans terminer le scan.
- Le pont de capture est versionné et réinjecté dans l'onglet YouTube : un
  ancien content script resté en cache après mise à jour ne bloque plus le
  scan.
- Retour automatique à Cover Studio avant décodage/analyse.

### 3.5.1

- Correction de la capture YouTube : `captureStream()` renvoie aussi une piste
  vidéo, et un `MediaRecorder` audio/webm refusait de démarrer sur ce flux
  mixte (« Failed to execute 'start' on 'MediaRecorder' »). La capture
  enregistre désormais uniquement les pistes audio.
- Testé avec une vidéo locale : capture audio/webm Opus valide.

### 3.5.0

- Nouveau sélecteur **Mode** avant le lancement : Dégrader ou **Ralentir 50 %**.
- Ralentissement 50 % avec source WAV et sortie WAV PCM, sans MP3, EQ ni
  compression : la qualité est conservée.
- En mode ralenti, l'extrait source est limité à 29 s (≈58 s après
  ralentissement), et Suno ne s'ouvre qu'après acceptation.
- Libellés et téléchargements adaptés : sample ralenti / dégradé / original.

### 3.4.2

- Export des samples testés, même refusés ; téléchargement automatique du
  dernier refusé et sélecteur par profil.
- Séparation claire original / accepté / testé.
- Suno ne s'ouvre qu'après acceptation ; Remix > Cover ensuite.
- Profils dégradés renforcés sans pitch/vitesse.

### 3.4.1 / 3.4.0

Workflow 3 étapes, style/voix, moteur caché, dégradation cover-safe, nom
discret, suppression de la barre latérale et des Modèles.

### 3.3.x

Remplissage Suno V2, workflow automatique, Cover Studio, sans PIN.
