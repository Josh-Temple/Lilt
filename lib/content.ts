import seedRaw from "@/content/seed.json";
import { ContentData, Pack, PackPhraseLink, Phrase } from "@/lib/types";

const seed = seedRaw as ContentData;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, "");

const leadText = (phraseText: string) => phraseText.replace("...", "").trim();

const inferLink = (pack: Pack, phrase: Phrase): PackPhraseLink => {
  const transcriptNorm = normalize(pack.transcript);
  const key = normalize(leadText(phrase.text));
  const idxNorm = transcriptNorm.indexOf(key);

  if (idxNorm === -1) {
    return {
      packId: pack.id,
      phraseId: phrase.id,
      startIndex: 0,
      endIndex: 0,
      role: "support",
    };
  }

  const lowerOriginal = pack.transcript.toLowerCase();
  const firstWord = key.split(" ")[0];
  const originalStart = lowerOriginal.indexOf(firstWord);

  return {
    packId: pack.id,
    phraseId: phrase.id,
    startIndex: Math.max(0, originalStart),
    endIndex: Math.max(originalStart + firstWord.length, originalStart + key.length),
    role: "main",
  };
};

const inferredLinks = seed.packs.flatMap((pack) =>
  pack.phraseIds
    .map((phraseId) => {
      const phrase = seed.phrases.find((item) => item.id === phraseId);
      if (!phrase) return null;
      return inferLink(pack, phrase);
    })
    .filter((item): item is PackPhraseLink => Boolean(item)),
);

const contentData: ContentData = {
  packs: seed.packs,
  phrases: seed.phrases,
  links: inferredLinks,
};

export const contentService = {
  getAll(): ContentData {
    return contentData;
  },
  getPacks() {
    return contentData.packs;
  },
  getPack(id: string) {
    return contentData.packs.find((pack) => pack.id === id);
  },
  getPhrase(id: string) {
    return contentData.phrases.find((phrase) => phrase.id === id);
  },
  getPhrasesByPack(packId: string) {
    const pack = this.getPack(packId);
    if (!pack) return [];
    return pack.phraseIds
      .map((id) => contentData.phrases.find((phrase) => phrase.id === id))
      .filter((phrase): phrase is Phrase => Boolean(phrase));
  },
  getPackLinks(packId: string) {
    return contentData.links.filter((link) => link.packId === packId);
  },
};
