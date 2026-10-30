"use strict";

/* game-republic-quiz: the wider-world tier q25-q30 and the ladder it joins.
 *
 * This engine has exactly two levers per rung - how many cards a sitting
 * deals and where its three bands sit - so the gate holds both to shape.
 * Every deck in the ladder must be well-formed in both languages (question,
 * four distinct options, a legal answer index, a teaching note), its bands
 * must run downwards and fit the deck it grades, and a perfect sitting must
 * replay to exactly three stars through the shipped starsFor scorer while a
 * blank sitting earns nothing. The wider-world tier keeps the seven-card
 * shape of the computing age but pulls the bands in to [6,5,3] - one miss
 * forgiven at the summit, strictly tighter than the [5,4,2] below it - and
 * its six deck names must resolve in both language packs. Finally the gate
 * refuses a question that two decks ask twice: the quiz teaches, so it must
 * not repeat itself. */

module.exports = function gate(ctx) {
  const { App, check } = ctx;
  const decks = App.republicDecks;
  const frontierIds = ["q25", "q26", "q27", "q28", "q29", "q30"];
  const goldTierIds = ["q11", "q12", "q13", "q14", "q15", "q16",
    "q17", "q18", "q19", "q20", "q21", "q22", "q23", "q24"];

  const ids = decks.map((deck) => deck.id);
  check("game-republic-quiz", "the ladder holds thirty decks",
    decks.length === 30, String(decks.length));
  check("game-republic-quiz", "every deck id is distinct",
    new Set(ids).size === ids.length, ids.join(","));
  check("game-republic-quiz", "the deck ids stay in order q1-q30",
    ids.every((id, index) => id === "q" + (index + 1)), ids.join(","));

  const byId = {};
  decks.forEach((deck) => { byId[deck.id] = deck; });
  const frontier = frontierIds.map((id) => byId[id]);
  const goldTier = goldTierIds.map((id) => byId[id]);
  check("game-republic-quiz", "the wider-world tier q25-q30 is present in order",
    frontier.every((deck) => !!deck) &&
      frontierIds.every((id, index) => ids.indexOf(id) > (index === 0 ? -1 : ids.indexOf(frontierIds[index - 1]))),
    frontier.filter((deck) => !deck).join(",") || "ordered");

  /* Shape: every deck in the ladder, shipped or new, in both languages. */
  const shapeProblems = [];
  decks.forEach((deck) => {
    const ok = deck.cards.length >= 4 && deck.stars[0] > deck.stars[1] &&
      deck.stars[1] > deck.stars[2] && deck.stars[2] >= 1 &&
      deck.stars[0] <= deck.cards.length &&
      deck.cards.every((card) =>
        card.q && card.q.en && card.q.zh &&
        card.o && card.o.length === 4 &&
        card.o.every((option) => option && option.en && option.zh) &&
        new Set(card.o.map((option) => option.en)).size === 4 &&
        Number.isInteger(card.a) && card.a >= 0 && card.a < 4 &&
        card.note && card.note.en && card.note.zh);
    if (!ok) {
      shapeProblems.push(deck.id);
    }
  });
  check("game-republic-quiz",
    "every deck is bilingual, four distinct options, honest descending bands",
    shapeProblems.length === 0, shapeProblems.join(","));

  /* The scorer: a perfect sitting is three stars, a blank one is none. */
  const scorerProblems = [];
  decks.forEach((deck) => {
    if (App.starsFor(deck.cards.length, deck.stars, "high") !== 3) {
      scorerProblems.push(deck.id + " perfect sitting misses three stars");
    }
    if (App.starsFor(0, deck.stars, "high") !== 0) {
      scorerProblems.push(deck.id + " blank sitting earns stars");
    }
    if (App.starsFor(deck.stars[1], deck.stars, "high") < 2) {
      scorerProblems.push(deck.id + " two-star band unreachable");
    }
  });
  check("game-republic-quiz",
    "a perfect sitting replays to three stars and a blank one to none, in every deck",
    scorerProblems.length === 0, scorerProblems.join(" | "));

  /* The gold tier keeps the shape the shipped gate pinned: seven cards,
   * bands [5,4,2] - three stars forgives two misses. */
  const goldProblems = [];
  goldTier.forEach((deck) => {
    if (deck.cards.length !== 7 || deck.stars[0] !== 5 ||
      deck.stars[1] !== 4 || deck.stars[2] !== 2) {
      goldProblems.push(deck.id + ":" + deck.cards.length + "/" + deck.stars.join("-"));
    }
  });
  check("game-republic-quiz",
    "the computing-age tier q11-q24 keeps its seven cards and [5,4,2] bands",
    goldProblems.length === 0, goldProblems.join(","));

  /* The wider-world tier: same seven-card shape, bands pulled in to [6,5,3]
   * - one miss at the summit, strictly tighter than the tier below. */
  const frontierProblems = [];
  frontier.forEach((deck) => {
    if (deck.cards.length !== 7 || deck.stars[0] !== 6 ||
      deck.stars[1] !== 5 || deck.stars[2] !== 3) {
      frontierProblems.push(deck.id + ":" + deck.cards.length + "/" + deck.stars.join("-"));
    }
  });
  check("game-republic-quiz",
    "the wider-world tier q25-q30 keeps seven cards and the tightened [6,5,3] bands",
    frontierProblems.length === 0, frontierProblems.join(","));
  check("game-republic-quiz",
    "the summit bands are strictly tighter than the computing-age bands",
    frontier.every((deck) => deck.stars[0] > byId.q24.stars[0] &&
      deck.stars[1] > byId.q24.stars[1] && deck.stars[2] > byId.q24.stars[2]),
    frontier.map((deck) => deck.stars.join("/")).join(","));

  /* The names travel in both packs, the way archive-escape's gate reads
   * them: t() resolves off the live dictionary, zh holds its own value. */
  const nameProblems = [];
  frontierIds.forEach((deckId, index) => {
    const key = "rqD" + (25 + index);
    const en = App.t(key);
    const zh = App.I18N.zh[key];
    if (!en || en === key || !zh || zh === key || en === zh) {
      nameProblems.push(key + " (en " + JSON.stringify(en) + ", zh " + JSON.stringify(zh) + ")");
    }
  });
  check("game-republic-quiz",
    "the six wider-world deck names resolve to distinct names in both languages",
    nameProblems.length === 0, nameProblems.join(" | "));

  /* The quiz must not teach the same question twice across the ladder. */
  const seen = {};
  const repeats = [];
  decks.forEach((deck) => {
    deck.cards.forEach((card) => {
      const asked = card.q.en.trim().toLowerCase();
      if (seen[asked]) {
        repeats.push(deck.id + " repeats " + seen[asked]);
      }
      seen[asked] = deck.id;
    });
  });
  check("game-republic-quiz", "no question is asked twice across the thirty decks",
    repeats.length === 0, repeats.join(" | "));
};
