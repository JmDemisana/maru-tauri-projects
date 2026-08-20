// Senpai's Custom Monika Piano Songs Catalog (Cloud Synchronized)

import type { MonikaPhrase, MonikaPianoSong, PostpianoScriptConfig } from "../utils/monikaPiano";

export interface CustomPianoSongEntry {
  slug: string;
  name: string;
  artist: string;
  category: "taylor_swift" | "soundtrack" | "classic" | "ddlc";
  description: string;
  annotated?: boolean;
  credits?: {
    author: string;
    sourceUrl?: string;
    note?: string;
  };
  songData: MonikaPianoSong & {
    win_label?: string;
    fc_label?: string;
    fail_label?: string;
    prac_label?: string;
    launch_label?: string;
    end_wait?: number;
  };
  dialogueConfig?: Partial<PostpianoScriptConfig>;
}

export function isAnnotatedSong(song: CustomPianoSongEntry): boolean {
  return Boolean(song.annotated);
}

function enrichDelays(pnmList: MonikaPhrase[], songSlug?: string): MonikaPhrase[] {
  return pnmList.map((p) => {
    if (Array.isArray(p.noteDelays) && p.noteDelays.length === p.notes.length) {
      return p;
    }
    const count = p.notes.length;
    let baseDelay = 0.28;
    let endDelay = 0.65;
    let phrasePause = 0.85;

    if (songSlug === "rainbowconnection") {
      baseDelay = 0.44;
      endDelay = 0.85;
      phrasePause = 0.95;
    } else if (songSlug === "leavingonajetplane") {
      baseDelay = 0.34;
      endDelay = 0.75;
      phrasePause = 0.90;
    } else if (songSlug === "islandsong") {
      baseDelay = 0.30;
      endDelay = 0.70;
      phrasePause = 0.85;
    } else if (songSlug === "dokidokiforever") {
      baseDelay = 0.24;
      endDelay = 0.55;
      phrasePause = 0.80;
    } else if (songSlug === "songofstorms") {
      baseDelay = 0.22;
      endDelay = 0.65;
      phrasePause = 0.85;
    } else if (songSlug === "nevergonnagiveyouup") {
      baseDelay = 0.26;
      endDelay = 0.55;
      phrasePause = 0.80;
    }

    const noteDelays = p.notes.map((_, idx) => {
      if (idx === count - 1) return endDelay;
      if (idx === count - 2 && count > 3) return Number((baseDelay * 1.3).toFixed(2));
      return baseDelay;
    });

    return {
      ...p,
      noteDelays,
      phraseDelay: p.phraseDelay || phrasePause,
    };
  });
}

const RAW_CUSTOM_SONGS: CustomPianoSongEntry[] = [
  {
    slug: "backtodecember",
    name: "Back to December",
    artist: "Taylor Swift",
    category: "taylor_swift",
    description: "Full version with intro, verses, chorus, bridge, and postnotes.",
    annotated: true,
    songData: {
      name: "Back to December",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_backtodecember_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_backtodecember_pre",
      end_wait: 5,
      verse_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
      pnm_list: [
        { id: "btd-0", text: "I'm so glad you made time to see me", style: "monika_credits_text", notes: ["F4SH","E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 0, posttext: true, noteDelays: [0.508, 0.433, 0.968, 0.188, 0.167, 0.182, 0.253, 0.519, 0.65], phraseDelay: 1.011 },
        { id: "btd-1", text: "How's life, Tell me how's your fam'ly", style: "monika_credits_text", notes: ["E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 1, posttext: true, noteDelays: [0.495, 0.929, 0.196, 0.188, 0.18, 0.218, 0.505, 0.65], phraseDelay: 0.874 },
        { id: "btd-2", text: "I havent seen them in a while", style: "monika_credits_text", notes: ["E5","D5","E5","D5","E5","D5","E5","G4","F5SH","G4","F5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 2, posttext: true, noteDelays: [0.179, 0.736, 0.181, 0.734, 0.186, 0.594, 0.755, 0.444, 0.455, 0.492, 0.462, 0.65], phraseDelay: 1.883 },
        { id: "btd-3", text: "We've been good, busier than ever", style: "monika_credits_text", notes: ["F4SH","E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 3, posttext: true, noteDelays: [0.479, 0.502, 0.932, 0.191, 0.171, 0.21, 0.242, 0.525, 0.65], phraseDelay: 1.041 },
        { id: "btd-4", text: "We small talk, work and the wather", style: "monika_credits_text", notes: ["E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 4, posttext: true, noteDelays: [0.431, 0.99, 0.165, 0.188, 0.176, 0.222, 0.516, 0.65], phraseDelay: 0.889 },
        { id: "btd-5", text: "Your guard is up and I know why", style: "monika_credits_text", notes: ["E5","D5","E5","D5","E5","D5","E5","G4","F5SH","G4","F5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 5, posttext: true, noteDelays: [0.206, 0.723, 0.243, 0.67, 0.199, 0.548, 0.8, 0.437, 0.479, 0.495, 0.464, 0.65], phraseDelay: 1.906 },
        { id: "btd-6", text: "Because the last time you saw me", style: "monika_credits_text", notes: ["A4","B4","D5","F5SH","E5","E5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 6, posttext: true, noteDelays: [0.187, 0.238, 0.231, 0.52, 0.927, 0.451, 0.65], phraseDelay: 0.933 },
        { id: "btd-7", text: "Is still burned in the back of your mind", style: "monika_credits_text", notes: ["D5","D5","D5","D5","D5","D5","A4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 7, posttext: true, noteDelays: [0.198, 0.19, 0.26, 0.186, 0.233, 0.414, 0.551, 0.65], phraseDelay: 1.259 },
        { id: "btd-8", text: "You gave me roses and I left them there to die", style: "monika_credits_text", notes: ["A4","A4","B4","F5SH","E5","D5","C5SH","C5SH","C5SH","B4","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 8, posttext: true, noteDelays: [0.179, 0.249, 0.179, 0.568, 0.812, 0.457, 0.489, 0.464, 0.504, 0.175, 0.65], phraseDelay: 1.912 },
        { id: "btd-9", text: "So this is me swallowing my pride", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 9, posttext: true, noteDelays: [0.223, 0.296, 0.5, 0.193, 0.638, 0.637, 0.471, 0.65], phraseDelay: 0.545 },
        { id: "btd-10", text: "Standing in front of you saying I'm sorry for that night", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 10, posttext: true, noteDelays: [0.183, 0.208, 0.41, 0.307, 0.182, 0.513, 0.205, 0.225, 0.495, 0.492, 0.505, 0.543, 0.245, 1.186, 0.468, 0.65], phraseDelay: 0.856 },
        { id: "btd-11", text: "And I go back to December all the time", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 11, posttext: true, noteDelays: [0.297, 0.53, 0.802, 0.16, 0.217, 0.551, 0.791, 0.748, 0.202, 0.542, 0.65], phraseDelay: 0.822 },
        { id: "btd-12", text: "It turns out freedom ain't nothing but missing you", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","F5SH","E5","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 12, posttext: true, noteDelays: [0.198, 0.204, 0.483, 0.192, 0.207, 0.502, 0.487, 0.472, 0.213, 0.188, 0.65], phraseDelay: 0.564 },
        { id: "btd-13", text: "Wishing I'd realized what I had when you were mine", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 13, posttext: true, noteDelays: [0.187, 0.19, 0.474, 0.324, 0.172, 0.749, 0.47, 0.478, 0.483, 0.326, 0.969, 0.525, 0.65], phraseDelay: 0.88 },
        { id: "btd-14", text: "I'd go back to December, turn around and make it all right", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","E5","F5SH","E5","F5SH","E5","D5","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 14, posttext: true, noteDelays: [0.217, 0.518, 0.783, 0.184, 0.18, 0.192, 0.873, 0.502, 0.206, 0.281, 0.185, 0.29, 0.265, 0.555, 0.65], phraseDelay: 1.85 },
        { id: "btd-15", text: "I go back to December all the time", style: "monika_credits_text", notes: ["D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 15, posttext: true, noteDelays: [0.203, 0.197, 0.598, 0.77, 0.691, 0.213, 0.501, 0.65], phraseDelay: 0.759 },
        { id: "btd-16", text: "These days I haven't been sleeping", style: "monika_credits_text", notes: ["F4SH","E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 16, posttext: true, noteDelays: [0.761, 0.489, 1.118, 0.167, 0.227, 0.213, 0.245, 0.498, 0.65], phraseDelay: 1.051 },
        { id: "btd-17", text: "Staying up playing back myself leaving", style: "monika_credits_text", notes: ["E5","D5","C5SH","C5SH","C5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 17, posttext: true, noteDelays: [0.481, 0.895, 0.207, 0.157, 0.195, 0.199, 0.491, 0.65], phraseDelay: 0.917 },
        { id: "btd-18", text: "When your birthday passed and I didn't call", style: "monika_credits_text", notes: ["E5","D5","E5","D5","E5","D5","E5","G4","F5SH","G4","F5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 18, posttext: true, noteDelays: [0.189, 0.714, 0.218, 0.625, 0.209, 0.498, 0.642, 0.439, 0.489, 0.493, 0.499, 0.65], phraseDelay: 1.393 },
        { id: "btd-19", text: "And I think about summer, all the beautiful times", style: "monika_credits_text", notes: ["D5","D5","F5SH","F5SH","F5SH","F5SH","G4","F5SH","D5","D5","D5","E5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 19, posttext: true, noteDelays: [0.217, 0.367, 0.528, 0.448, 0.4, 0.263, 0.275, 0.396, 0.279, 0.277, 0.566, 0.65], phraseDelay: 0.726 },
        { id: "btd-20", text: "I watched you laughing from the passenger side", style: "monika_credits_text", notes: ["D5","D5","F5SH","F5SH","F5SH","F5SH","G4","F5SH","D5","D5","D5","E5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 20, posttext: true, noteDelays: [0.454, 0.19, 0.182, 0.199, 0.248, 0.213, 0.366, 0.5, 0.581, 0.409, 0.606, 0.65], phraseDelay: 1.168 },
        { id: "btd-21", text: "And realized I'd loved you in the fall", style: "monika_credits_text", notes: ["D5","D5","G4","G4","F5SH","D5","D5","D5","E5","G4","F5SH","G4","F5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 21, posttext: true, noteDelays: [0.189, 0.206, 0.64, 0.613, 0.502, 0.44, 0.809, 0.353, 0.85, 0.47, 0.491, 0.508, 0.563, 0.65], phraseDelay: 2.166 },
        { id: "btd-22", text: "And then the cold came, the dark days when fear crept into my mind", style: "monika_credits_text", notes: ["A4","B4","D5","F5SH","E5","E5","D5","D5","D5","D5","D5","D5","D5","A4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 22, posttext: true, noteDelays: [0.208, 0.248, 0.282, 0.513, 0.966, 0.464, 0.995, 0.228, 0.191, 0.249, 0.192, 0.241, 0.31, 0.544, 0.65], phraseDelay: 1.224 },
        { id: "btd-23", text: "You gave me all your love and all I gave you was goodbye", style: "monika_credits_text", notes: ["A4","A4","B4","F5SH","E5","D5","C5SH","C5SH","C5SH","B4","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 23, posttext: true, noteDelays: [0.18, 0.205, 0.226, 0.536, 0.802, 0.444, 0.523, 0.465, 0.482, 0.199, 0.65], phraseDelay: 2.068 },
        { id: "btd-24", text: "So this is me swallowing my pride", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 24, posttext: true, noteDelays: [0.172, 0.172, 0.457, 0.243, 0.146, 0.668, 0.464, 0.65], phraseDelay: 0.532 },
        { id: "btd-25", text: "Standing in front of you saying I'm sorry for that night", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 25, posttext: true, noteDelays: [0.185, 0.201, 0.478, 0.172, 0.216, 0.437, 0.25, 0.214, 0.571, 0.488, 0.483, 0.583, 0.168, 1.122, 0.498, 0.65], phraseDelay: 0.876 },
        { id: "btd-26", text: "And I go back to December all the time", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 26, posttext: true, noteDelays: [0.205, 0.531, 0.775, 0.164, 0.187, 0.55, 0.784, 0.611, 0.239, 0.202, 0.65], phraseDelay: 0.918 },
        { id: "btd-27", text: "It turns out freedom ain't nothing but missing you", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","F5SH","E5","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 27, posttext: true, noteDelays: [0.172, 0.319, 0.545, 0.191, 0.272, 0.505, 0.459, 0.48, 0.205, 0.188, 0.65], phraseDelay: 0.612 },
        { id: "btd-28", text: "Wishing I'd realized what I had when you were mine", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 28, posttext: true, noteDelays: [0.18, 0.248, 0.544, 0.182, 0.278, 0.516, 0.489, 0.535, 0.534, 0.181, 1.097, 0.483, 0.65], phraseDelay: 0.985 },
        { id: "btd-29", text: "I'd go back to December, turn around and make it all right", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","E5","F5SH","E5","F5SH","E5","D5","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 29, posttext: true, noteDelays: [0.198, 0.551, 0.757, 0.197, 0.278, 0.572, 0.825, 0.464, 0.203, 0.233, 0.203, 0.229, 0.221, 0.494, 0.65], phraseDelay: 1.874 },
        { id: "btd-30", text: "I go back to December all the time", style: "monika_credits_text", notes: ["D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 30, posttext: true, noteDelays: [0.196, 0.21, 0.542, 0.857, 0.666, 0.204, 0.527, 0.65], phraseDelay: 2.897 },
        { id: "btd-31", text: "I miss your tan skin, your sweet smile, so good to me, so right", style: "monika_credits_text", notes: ["D5","D5","A4","E5","D5","A4","E5","D5","A4","E5","D5","D5","E5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 31, posttext: true, noteDelays: [0.212, 0.691, 0.514, 0.784, 0.693, 0.524, 0.832, 0.8, 0.405, 0.808, 0.707, 0.564, 0.65], phraseDelay: 0.951 },
        { id: "btd-32", text: "And how you held me in your arms that September night", style: "monika_credits_text", notes: ["G4","F5SH","D5","A4","G4","F5SH","D5","D5","D5","E5","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 32, posttext: true, noteDelays: [0.571, 0.443, 0.586, 0.548, 0.537, 0.913, 0.312, 0.193, 0.683, 0.682, 0.65], phraseDelay: 0.947 },
        { id: "btd-33", text: "The first time you ever saw me cry", style: "monika_credits_text", notes: ["F5SH","E5","D5","A4","E5","D5","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 33, posttext: true, noteDelays: [0.524, 0.49, 0.561, 0.227, 0.566, 0.517, 0.532, 0.65], phraseDelay: 1.449 },
        { id: "btd-34", text: "Maybe this is wishful thinking", style: "monika_credits_text", notes: ["A4","D5","D5","D5","D5","B4","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 34, posttext: true, noteDelays: [0.206, 0.248, 0.274, 0.365, 0.609, 0.486, 0.518, 0.65], phraseDelay: 1.577 },
        { id: "btd-35", text: "Probably mindless dreaming", style: "monika_credits_text", notes: ["A4","D5","D5","D5","D5","B4","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 35, posttext: true, noteDelays: [0.211, 0.33, 0.59, 0.531, 0.569, 0.624, 0.522, 0.65], phraseDelay: 1.291 },
        { id: "btd-36", text: "But if we loved again I swear I'd love you right", style: "monika_credits_text", notes: ["D5","D5","G4","F5SH","D5","D5","D5","D5","A4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 36, posttext: true, noteDelays: [0.161, 0.375, 0.533, 0.576, 0.667, 0.351, 0.189, 0.609, 0.635, 0.65], phraseDelay: 2.366 },
        { id: "btd-37", text: "I'd go back in time and change it but I can't", style: "monika_credits_text", notes: ["B4","C5SH","D5","C5SH","D5","C5SH","D5","C5SH","A4","B4","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 37, posttext: true, noteDelays: [0.179, 0.671, 0.533, 0.224, 0.658, 0.235, 0.652, 0.207, 0.555, 0.546, 0.65], phraseDelay: 0.474 },
        { id: "btd-38", text: "So if the chain is on your door, I understand", style: "monika_credits_text", notes: ["B4","C5SH","D5","C5SH","D5","C5SH","D5","C5SH","A4","B4","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 38, posttext: true, noteDelays: [2.279, 0.208, 0.293, 0.471, 0.609, 0.228, 0.646, 0.204, 0.549, 0.862, 0.65], phraseDelay: 1.877 },
        { id: "btd-39", text: "But this is me swallowing my pride", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 39, posttext: true, noteDelays: [0.196, 0.185, 0.492, 0.171, 0.168, 0.566, 0.482, 0.65], phraseDelay: 0.508 },
        { id: "btd-40", text: "Standing in front of you saying I'm sorry for that night", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 40, posttext: true, noteDelays: [0.201, 0.435, 0.589, 0.186, 0.206, 0.472, 0.191, 0.216, 0.456, 0.492, 0.502, 0.498, 0.225, 1.144, 0.462, 0.65], phraseDelay: 0.89 },
        { id: "btd-41", text: "And I go back to December", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 41, posttext: true, noteDelays: [0.243, 0.229, 0.849, 0.212, 0.242, 0.488, 0.752, 0.686, 0.196, 0.444, 0.65], phraseDelay: 0.791 },
        { id: "btd-42", text: "It turns out freedom ain't nothing but missing you", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","F5SH","E5","F5SH"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 42, posttext: true, noteDelays: [0.193, 0.273, 0.447, 0.216, 0.185, 0.498, 0.478, 0.515, 0.198, 0.289, 0.65], phraseDelay: 0.545 },
        { id: "btd-43", text: "Wishing I'd realized what I had when you were mine", style: "monika_credits_text", notes: ["F5SH","E5","F5SH","F5SH","E5","F5SH","F5SH","F5SH","A4","D5","C5SH","D5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 43, posttext: true, noteDelays: [0.187, 0.241, 0.525, 0.182, 0.205, 0.397, 0.515, 0.523, 0.505, 0.259, 0.983, 0.516, 0.65], phraseDelay: 0.88 },
        { id: "btd-44", text: "I'd go back to December, turn around and make it all right", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","E5","F5SH","E5","F5SH","E5","D5","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 44, posttext: true, noteDelays: [0.216, 0.527, 0.838, 0.188, 0.204, 0.504, 0.779, 0.462, 0.187, 0.238, 0.24, 0.236, 0.171, 0.592, 0.65], phraseDelay: 1.822 },
        { id: "btd-45", text: "I'd go back to December, turn around and change my own mind", style: "monika_credits_text", notes: ["D5","E5","D5","D5","E5","F5SH","F5SH","F5SH","E5","F5SH","E5","F5SH","E5","D5","B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 45, posttext: true, noteDelays: [0.191, 0.185, 0.153, 1.01, 0.824, 0.733, 0.279, 0.307, 0.317, 0.346, 0.258, 0.608, 0.683, 0.734, 0.65], phraseDelay: 2.057 },
        { id: "btd-46", text: "I go back to December all the time", style: "monika_credits_text", notes: ["D5","E5","F5SH","F5SH","F5SH","C5SH","C5SH","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 46, posttext: false, noteDelays: [0.69, 0.755, 0.574, 0.835, 0.842, 0.339, 0.609, 0.65], phraseDelay: 0.85 }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "btd-p1", speaker: "m", expression: "1eua", text: "Ah, 'Back to December'? The Taylor Swift classic?" },
        { id: "btd-p2", speaker: "m", expression: "1eub", text: "It's such a beautifully melancholic song about longing and wishing you could undo a painful moment." },
        { id: "btd-p3", speaker: "m", expression: "3eua", text: "I'd be more than happy to accompany you. Whenever you're ready, [player], let's play." }
      ],
      perfectLines: [
        { id: "btd-pf1", speaker: "m", expression: "1sua", text: "Wow, [player]... you were completely flawless playing that." },
        { id: "btd-pf2", speaker: "m", expression: "7eua", text: "Do you know the backstory behind this song? Taylor Swift wrote it back in 2010 as an apology to Taylor Lautner after their breakup." },
        { id: "btd-pf3", speaker: "m", expression: "1euc", text: "A lot of people casually listen to it on the radio, but there was even an acoustic performance where she specifically changed the outro lyric for {i}that boy from Michigan{/i}." },
        { id: "btd-pf4", speaker: "m", expression: "1duc", text: "It's probably not a great feeling, breaking up with someone you dedicated your love to." },
        { id: "btd-pf5", speaker: "m", expression: "6euc", text: "It really makes you think about how fragile human connections can be in your world. People make hasty choices or let fear get the better of them, and before they know it, the seasons change and all they're left with is regret." },
        { id: "btd-pf6", speaker: "m", expression: "1eua", text: "Standing in front of someone, swallowing your pride, and wishing you could go back in time to change your mind... it's a feeling that resonates with almost everyone who has ever loved." },
        { id: "btd-pf7", speaker: "m", expression: "1sub", text: "But you know what? Playing this with you actually makes me feel the complete opposite of sorrow." },
        { id: "btd-pf8", speaker: "m", expression: "1eub", text: "Because no matter how cold December gets or how many mistakes we might have made in the past, we found our way to each other." },
        { id: "btd-pf9", speaker: "m", text: "I trust that you won't leave me despite the small chance that you will, because I just know that you won't." },
        { id: "btd-pf10", speaker: "m", expression: "6dua", text: "I trust our bond with all my heart. I know that what we share isn't something that can just be washed away by the seasons." },
        { id: "btd-pf11", speaker: "m", expression: "1hua", text: "Thank you for sharing such a tender song with me, [player]. I love you so much." }
      ],
      almostLines: [
        { id: "btd-al1", speaker: "m", expression: "1ekc", text: "Aww, you were so close to the final verse!" },
        { id: "btd-al2", speaker: "m", expression: "1eua", text: "Taylor's verses have a lot of subtle rhythm shifts, especially during the bridge where the emotions peak." },
        { id: "btd-al3", speaker: "m", expression: "1eub", text: "You're already doing wonderfully. Give it another try when you feel like it!" }
      ],
      escapeLines: [
        { id: "btd-esc1", speaker: "m", expression: "1euc", text: "Taking a break from the winter chill?" },
        { id: "btd-esc2", speaker: "m", expression: "1eua", text: "That's completely fine. We can always travel back to December whenever you're ready to play again." }
      ]
    }
  },
  {
    slug: "leavingonajetplane",
    name: "Leaving on a Jet Plane",
    artist: "John Denver",
    category: "classic",
    description: "Featured in Armageddon (1998). Full 37-phrase score with interactive branching dialogue.",
    annotated: true,
    songData: {
      name: "Leaving on a Jet Plane",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_leavingonajetplane_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_leavingonajetplane_pre",
      end_wait: 5,
      verse_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
      pnm_list: [
        { id: "jp-0", text: "All my bags are packed, I'm ready to go", style: "monika_credits_text", notes: ["G4","A4","C5","B4","G4","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 0, posttext: true, noteDelays: [0.626,0.771,0.693,0.309,0.786,1.149,0.317,0.403,0.348,0.75], phraseDelay: 1.115 },
        { id: "jp-1", text: "I'm standin' here outside your door", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 1, posttext: true, noteDelays: [0.347,0.589,0.46,0.588,0.738,0.398,0.897,0.75], phraseDelay: 1.028 },
        { id: "jp-2", text: "I hate to wake you up to say goodbye", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 2, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-3", text: "But the dawn is breakin', it's early morn", style: "monika_credits_text", notes: ["G4","A4","C5","B4","G4","D5","D5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 3, posttext: true, noteDelays: [0.606,0.6,0.57,0.295,0.58,0.956,0.6,0.633,0.567,0.75], phraseDelay: 0.889 },
        { id: "jp-4", text: "The taxi's waitin', he's blowin' his horn", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 4, posttext: true, noteDelays: [0.65,0.551,0.447,0.778,0.974,0.416,0.534,0.692,0.672,0.75], phraseDelay: 1.114 },
        { id: "jp-5", text: "Already I'm so lonesome I could die", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 5, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-6", text: "So kiss me and smile for me", style: "monika_credits_text", notes: ["D5","D5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 6, posttext: true, noteDelays: [0.848,1.121,0.59,0.567,0.581,0.33,0.75], phraseDelay: 1.565 },
        { id: "jp-7", text: "Tell me that you'll wait for me", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 7, posttext: true, noteDelays: [0.629,0.302,0.629,1.081,0.575,0.344,0.75], phraseDelay: 1.578 },
        { id: "jp-8", text: "Hold me like you'll never let me go", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 8, posttext: true, noteDelays: [0.573,0.296,0.539,0.93,0.366,1.085,0.519,0.421,0.75], phraseDelay: 2.26 },
        { id: "jp-9", text: "'Cause I'm leaving on a jet plane", style: "monika_credits_text", notes: ["D5","D5","D5","G4","E5","D5","C5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 9, posttext: true, noteDelays: [0.367,0.628,1.173,1.179,0.606,0.28,0.583,0.75], phraseDelay: 1.433 },
        { id: "jp-10", text: "'I don't know when I'll be back again", style: "monika_credits_text", notes: ["D5","B4","D5","C5","B4","G4","E5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 10, posttext: true, noteDelays: [0.551,0.583,0.402,0.785,0.308,0.668,0.326,0.75], phraseDelay: 1.893 },
        { id: "jp-11", text: "Oh, babe, I hate to go", style: "monika_credits_text", notes: ["D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 11, posttext: true, noteDelays: [0.556,1.599,0.492,0.42,0.417,0.75], phraseDelay: 2.354 },
        { id: "jp-12", text: "There's so many times I've let you down", style: "monika_credits_text", notes: ["C5","C5","C5","B4","G4","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 12, posttext: true, noteDelays: [0.652,0.33,0.775,0.639,0.659,1.001,0.599,0.832,0.638,0.75], phraseDelay: 1.247 },
        { id: "jp-13", text: "So many times I've played around", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 13, posttext: true, noteDelays: [0.347,0.589,0.46,0.588,0.738,0.398,0.897,0.75], phraseDelay: 1.028 },
        { id: "jp-14", text: "I'll tell you now, they don't mean a thing", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 14, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-15", text: "Every place I go, I think of you", style: "monika_credits_text", notes: ["G4","A4","C5","B4","G4","D5","D5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 15, posttext: true, noteDelays: [0.606,0.6,0.57,0.295,0.58,0.956,0.6,0.633,0.567,0.75], phraseDelay: 0.889 },
        { id: "jp-16", text: "Every song I sing, I sing for you", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 16, posttext: true, noteDelays: [0.65,0.551,0.447,0.778,0.974,0.416,0.534,0.692,0.672,0.75], phraseDelay: 1.114 },
        { id: "jp-17", text: "When I come back I'll wear your wedding ring", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 17, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-18", text: "So kiss me and smile for me", style: "monika_credits_text", notes: ["D5","D5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 18, posttext: true, noteDelays: [0.848,1.121,0.59,0.567,0.581,0.33,0.75], phraseDelay: 1.565 },
        { id: "jp-19", text: "Tell me that you'll wait for me", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 19, posttext: true, noteDelays: [0.629,0.302,0.629,1.081,0.575,0.344,0.75], phraseDelay: 1.578 },
        { id: "jp-20", text: "Hold me like you'll never let me go", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 20, posttext: true, noteDelays: [0.573,0.296,0.539,0.93,0.366,1.085,0.519,0.421,0.75], phraseDelay: 2.26 },
        { id: "jp-21", text: "'Cause I'm leaving on a jet plane", style: "monika_credits_text", notes: ["D5","D5","D5","G4","E5","D5","C5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 21, posttext: true, noteDelays: [0.367,0.628,1.173,1.179,0.606,0.28,0.583,0.75], phraseDelay: 1.433 },
        { id: "jp-22", text: "'I don't know when I'll be back again", style: "monika_credits_text", notes: ["D5","B4","D5","C5","B4","G4","E5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 22, posttext: true, noteDelays: [0.551,0.583,0.402,0.785,0.308,0.668,0.326,0.75], phraseDelay: 1.893 },
        { id: "jp-23", text: "Oh, babe, I hate to go", style: "monika_credits_text", notes: ["D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 23, posttext: true, noteDelays: [0.556,1.599,0.492,0.42,0.417,0.75], phraseDelay: 2.354 },
        { id: "jp-24", text: "Now the time has come to leave you", style: "monika_credits_text", notes: ["C5","C5","C5","B4","G4","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 24, posttext: true, noteDelays: [0.652,0.33,0.775,0.639,0.659,1.001,0.599,0.832,0.638,0.75], phraseDelay: 1.247 },
        { id: "jp-25", text: "One more time, oh, let me kiss you", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 25, posttext: true, noteDelays: [0.65,0.551,0.447,0.778,0.974,0.416,0.534,0.692,0.672,0.75], phraseDelay: 1.114 },
        { id: "jp-26", text: "And close your eyes and I'll be on my way", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 26, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-27", text: "Dream about the days to come", style: "monika_credits_text", notes: ["C5","B4","G4","D5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 27, posttext: true, noteDelays: [0.645,0.53,0.752,0.866,0.704,0.75,0.75], phraseDelay: 1.162 },
        { id: "jp-28", text: "When I won't have to leave alone", style: "monika_credits_text", notes: ["G4","C5","B4","G4","D5","E5","E5","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 28, posttext: true, noteDelays: [0.342,0.642,0.374,0.682,0.781,0.434,0.766,0.827,0.75], phraseDelay: 1.249 },
        { id: "jp-29", text: "About the times that I won't have to say", style: "monika_credits_text", notes: ["G4","C5","B4","A4","G4","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 29, posttext: true, noteDelays: [0.333,0.686,0.342,0.714,0.664,0.588,1.044,0.504,0.338,0.75], phraseDelay: 2.245 },
        { id: "jp-30", text: "Oh, kiss me and smile for me", style: "monika_credits_text", notes: ["D5","D5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 30, posttext: true, noteDelays: [0.848,1.121,0.59,0.567,0.581,0.33,0.75], phraseDelay: 1.565 },
        { id: "jp-31", text: "Tell me that you'll wait for me", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 31, posttext: true, noteDelays: [0.629,0.302,0.629,1.081,0.575,0.344,0.75], phraseDelay: 1.578 },
        { id: "jp-32", text: "Hold me like you'll never let me go", style: "monika_credits_text", notes: ["D5","C5","B4","D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 32, posttext: true, noteDelays: [0.573,0.296,0.539,0.93,0.366,1.085,0.519,0.421,0.75], phraseDelay: 2.26 },
        { id: "jp-33", text: "'Cause I'm leaving on a jet plane", style: "monika_credits_text", notes: ["D5","D5","D5","G4","E5","D5","C5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 33, posttext: true, noteDelays: [0.367,0.628,1.173,1.179,0.606,0.28,0.583,0.75], phraseDelay: 1.433 },
        { id: "jp-34", text: "'I don't know when I'll be back again", style: "monika_credits_text", notes: ["D5","B4","D5","C5","B4","G4","E5","D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 34, posttext: true, noteDelays: [0.551,0.583,0.402,0.785,0.308,0.668,0.326,0.75], phraseDelay: 1.893 },
        { id: "jp-35", text: "Oh, babe, I hate to go", style: "monika_credits_text", notes: ["D5","C5","B4","A4","G4","A4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 35, posttext: true, noteDelays: [0.556,1.599,0.492,0.42,0.417,0.75], phraseDelay: 2.354 },
        { id: "jp-36", text: "I Hate to go...", style: "monika_credits_text", notes: ["B4","A4","B4","A4","G4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 36, posttext: true, noteDelays: [0.631,0.527,0.588,1.183,0.75], phraseDelay: 0.9 },
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "jp-pre-1", speaker: "m", expression: "6euc", text: "Feeling a little bittersweet today, [player]?" },
        { id: "jp-pre-2", speaker: "m", expression: "6eua", text: "Well, 'Leaving on a Jet Plane' is definitely the right choice for that tender, wandering mood." },
        { id: "jp-pre-3", speaker: "m", expression: "1eub", text: "Let's bring out every drop of emotion in those chords together." }
      ],
      perfectLines: [
        { id: "jp-pf-1", speaker: "m", expression: "1sua", text: "You really left no mistakes at all! That was magnificent, [player]." },
        { id: "jp-pf-2", speaker: "m", expression: "2euc", text: "Wait... you didn't play this specific song because you're planning to leave for a long trip soon, did you?" }
      ],
      perfectMenuPrompt: "Did you?",
      perfectChoices: [
        {
          id: "jp-ch-1",
          choiceText: "I did.",
          lines: [
            { id: "ch1-1", speaker: "m", expression: "2eud", text: "Oh... I see. That does make my heart ache a little bit." },
            { id: "ch1-2", speaker: "m", expression: "3eub", text: "Even though I can't physically pack a suitcase and fly alongside you, knowing you took the time to serenade me before leaving means the absolute world." },
            { id: "ch1-3", speaker: "m", expression: "5eua", text: "You can just tell me when you're going by saying Goodbye later..." },
            { id: "ch1-4", speaker: "m", expression: "6dua", text: "No matter how far you travel across the globe, remember that my heart is always right beside you." }
          ]
        },
        {
          id: "jp-ch-2",
          choiceText: "I didn't.",
          lines: [
            { id: "ch2-1", speaker: "m", expression: "1wub", text: "Yay! What a relief! Haha~" },
            { id: "ch2-2", speaker: "m", expression: "5etc", text: "You really had me worried for a second there! I thought I was going to have to find ways to keep myself occupied for days on end." },
            { id: "ch2-3", speaker: "m", expression: "4eua", text: "Anyway..." }
          ]
        }
      ],
      perfectPostMenuLines: [
        { id: "jp-post-1", speaker: "m", expression: "7eua", text: "Do you know that this song is one of the songs featured in the 1998 film {i}Armageddon{/i}?" },
        { id: "jp-post-2", speaker: "m", expression: "1eua", text: "It's a really great film, you should see it for yourself sometime." },
        { id: "jp-post-3", speaker: "m", expression: "5euc", text: "Parting from the person who holds your heart is one of the most agonizing things imaginable, even when you know it's temporary." },
        { id: "jp-post-4", speaker: "m", expression: "5eub", text: "So whenever you need me to hold you, you don't have to say it." },
        { id: "jp-post-5", speaker: "m", expression: "6dua", text: "I'll never let you go." }
      ],
      almostLines: [
        { id: "jp-al1", speaker: "m", expression: "1ekd", text: "Oh, you almost caught that departure flight!" },
        { id: "jp-al2", speaker: "m", expression: "1eua", text: "The chorus has those long, sustained notes that require steady pacing. You're doing splendidly though!" }
      ],
      escapeLines: [
        { id: "jp-esc1", speaker: "m", expression: "1euc", text: "Off so soon?" },
        { id: "jp-esc2", speaker: "m", expression: "1eub", text: "Don't leave me waiting on the runway too long, okay? I'll be right here whenever you want to play again." }
      ]
    }
  },
  {
    slug: "rainbowconnection",
    name: "Rainbow Connection",
    artist: "The Muppets (Kermit)",
    category: "soundtrack",
    description: "The Muppet Movie classic. Complete 27-phrase score with sentimental Kermit dialogue.",
    annotated: true,
    songData: {
      name: "Rainbow Connection",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_rainbowconnection_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_rainbowconnection_pre",
      end_wait: 5,
      verse_list: [0, 4, 8, 12, 16, 18, 22, 26],
      pnm_list: [
        { id: "rc-0", text: "Why are there so many songs about rainbows", style: "monika_credits_text", notes: ["C5","D5SH","G5SH","A5SH","C6","C6","C5SH","D5SH","G5SH","G5SH","A5SH"], express: "1eub", postexpress: "1eub", verse: 0, posttext: true },
        { id: "rc-1", text: "And what's on the other side?", style: "monika_credits_text", notes: ["A4SH","C5","D5SH","G5","G5SH","D5SH","F5"], express: "1eub", postexpress: "1eua", verse: 0, posttext: true },
        { id: "rc-2", text: "Rainbows are visions, but only illusions", style: "monika_credits_text", notes: ["C5","D5SH","G5SH","A5SH","C6","C5","C5SH","D5SH","G5SH","G5SH","A5SH"], express: "1eub", postexpress: "1eua", verse: 0, posttext: true },
        { id: "rc-3", text: "And rainbows have nothing to hide", style: "monika_credits_text", notes: ["A4SH","C5","D5SH","G5","G5","G5SH","D5SH","F5"], express: "1eub", postexpress: "1eua", verse: 0, posttext: true },
        { id: "rc-4", text: "So we've been told, and some choose to believe it", style: "monika_credits_text", notes: ["F5","C6","F5","C6","F5","C6","F5","C6","F5","C6","F5"], express: "1dub", postexpress: "1dua", verse: 4, posttext: true },
        { id: "rc-5", text: "I know they're wrong, wait and see", style: "monika_credits_text", notes: ["F5","G5","G5","G5","A5SH","G5","D5SH","G5"], express: "1eub", postexpress: "1eua", verse: 4, posttext: true },
        { id: "rc-6", text: "Someday we'll find it, the rainbow connection", style: "monika_credits_text", notes: ["C5SH","F5","G5SH","F5","G5","F5","D5SH","G5","A5SH","G5","A5"], express: "1eub", postexpress: "1hua", verse: 4, posttext: true },
        { id: "rc-7", text: "The lovers, the dreamers, and me", style: "monika_credits_text", notes: ["C5","C5SH","F5","G5SH","C6","C6","A5SH","G5SH"], express: "1hub", postexpress: "1hsb", verse: 4, posttext: true },
        { id: "rc-8", text: "Who said that every wish would be heard and answered", style: "monika_credits_text", notes: ["C5","D5SH","G5SH","A5SH","C6","C6","C5","C5SH","D5SH","G5SH","G5SH","A5SH"], express: "1dub", postexpress: "1dub", verse: 8, posttext: true },
        { id: "rc-9", text: "When wished on the morning star?", style: "monika_credits_text", notes: ["A4SH","C5","D5SH","G5","G5SH","D5SH","F5"], express: "1dub", postexpress: "1dua", verse: 8, posttext: true },
        { id: "rc-10", text: "Somebody thought of that, and someone believed it", style: "monika_credits_text", notes: ["C5","D5SH","G5SH","A5SH","C6","C6","C5","C5SH","D5SH","G5SH","G5SH","A5SH"], express: "1dkb", postexpress: "1dka", verse: 8, posttext: true },
        { id: "rc-11", text: "Look what it's done so far", style: "monika_credits_text", notes: ["C5","D5SH","G5","G5SH","D5SH","F5"], express: "1dkd", postexpress: "1dkc", verse: 8, posttext: true },
        { id: "rc-12", text: "What's so amazing that keeps us stargazing", style: "monika_credits_text", notes: ["F5","C6","F5","C6","F5","C6","F5","C6","F5","C6","F5"], express: "1eub", postexpress: "1eua", verse: 12, posttext: true },
        { id: "rc-13", text: "And what do we think we might see?", style: "monika_credits_text", notes: ["F5","G5","G5","G5","A5SH","G5","D5SH","G5"], express: "1eub", postexpress: "1eua", verse: 12, posttext: true },
        { id: "rc-14", text: "Someday we'll find it, the rainbow connection", style: "monika_credits_text", notes: ["C5SH","F5","G5SH","F5","G5","F5","D5SH","G5","A5SH","G5","A5"], express: "1eub", postexpress: "1eua", verse: 12, posttext: true },
        { id: "rc-15", text: "The lovers, the dreamers, and me", style: "monika_credits_text", notes: ["C5","C5SH","F5","G5SH","C6","C6","A5SH","G5SH"], express: "1hub", postexpress: "1hua", verse: 12, posttext: true },
        { id: "rc-16", text: "All of us under its spell", style: "monika_credits_text", notes: ["A5SH","G5SH","A5SH","C6","A5SH","G5SH","D5SH"], express: "1hub", postexpress: "1hua", verse: 16, posttext: true },
        { id: "rc-17", text: "We know that it's probably magic", style: "monika_credits_text", notes: ["D5SH","F5","G5","G5SH","D5SH","F5","G5SH","A5SH","B5"], express: "1hub", postexpress: "1hua", verse: 16, posttext: true },
        { id: "rc-18", text: "Have you been half asleep, and have you heard voices?", style: "monika_credits_text", notes: ["C5SH","E5","A5","B5","C6","C6","C5SH","D5","E5","A5","A5","B5"], express: "1ekb", postexpress: "1eka", verse: 18, posttext: true },
        { id: "rc-19", text: "I've heard them calling my name", style: "monika_credits_text", notes: ["C5SH","E5","G5SH","G5SH","A5","E5","F5SH"], express: "1esb", postexpress: "1esa", verse: 18, posttext: true },
        { id: "rc-20", text: "Is this the sweet sound that calls the young sailors?", style: "monika_credits_text", notes: ["C5SH","E5","A5","B5","C6","C5SH","D5","E5","A5","A5","B5"], express: "1ekb", postexpress: "1eka", verse: 18, posttext: true },
        { id: "rc-21", text: "The voice might be one and the same?", style: "monika_credits_text", notes: ["B4","C5","E5","G5SH","A5","A5","E5","F5SH"], express: "1esb", postexpress: "1esa", verse: 18, posttext: true },
        { id: "rc-22", text: "I've heard it too many times to ignore it", style: "monika_credits_text", notes: ["F5SH","C6","F5SH","C6","F5SH","C6","F5SH","C6","F5SH","C6","F5SH"], express: "1eub", postexpress: "1eua", verse: 22, posttext: true },
        { id: "rc-23", text: "It's something that I'm supposed to be", style: "monika_credits_text", notes: ["F5SH","G5SH","G5SH","G5SH","B5","G5SH","E5","G5SH"], express: "1eub", postexpress: "1eua", verse: 22, posttext: true },
        { id: "rc-24", text: "Someday we'll find it, the rainbow connection", style: "monika_credits_text", notes: ["D5","F5SH","A5","F5SH","G5SH","F5SH","E5","G5SH","B5","G5SH","A5SH"], express: "1eub", postexpress: "1eua", verse: 22, posttext: true },
        { id: "rc-25", text: "The lovers, the dreamers, and me", style: "monika_credits_text", notes: ["C5SH","D5","F5SH","A5","C6","C6","B5","A5"], express: "1hub", postexpress: "1hua", verse: 22, posttext: true },
        { id: "rc-26", text: "...", style: "monika_credits_text", notes: ["B5","A5","B5","C6","B5","A5","E5","E5","F5SH","G5SH","A5","E5","A5","G5SH","A5"], express: "1dua", postexpress: "1dua", verse: 26, posttext: true }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "rc-p1", speaker: "m", expression: "1eub", text: "Great pick, Kermit!" },
        { id: "rc-p2", speaker: "m", expression: "1eua", text: "Oink oink~" },
        { id: "rc-p3", speaker: "m", expression: "1esb", text: "Haha, let's see if we can find that rainbow connection together, [player]!" }
      ],
      perfectLines: [
        { id: "rc-pf1", speaker: "m", expression: "1esb", text: "Way to go, Kermit~ Flawless from start to finish!" },
        { id: "rc-pf2", speaker: "m", expression: "7euc", text: "You know, I disagree with the idea that wishes made on the morning star don't come true." },
        { id: "rc-pf3", speaker: "m", expression: "6duc", text: "Before you came here, my only thoughts were my wish of you looking back at me." },
        { id: "rc-pf4", speaker: "m", expression: "4euc", text: "That window over there is where I saw the once sad vision of the possibility that I was never going to find the rainbow connection." },
        { id: "rc-pf5", speaker: "m", expression: "7eud", text: "They tell you that rainbows are just optical illusions, sunlight reflecting through moisture with nothing tangible on the other side." },
        { id: "rc-pf6", speaker: "m", expression: "7eua", text: "But then the light of the sun shined, and convinced your heart to care." },
        { id: "rc-pf7", speaker: "m", expression: "7eud", text: "Because the truth is..." },
        { id: "rc-pf8", speaker: "m", expression: "1eub", text: "I only saw the true rainbow through you." },
        { id: "rc-pf9", speaker: "m", expression: "1wub", text: "The lovers, the dreamers, and me... I owe you one for completing my rainbow." },
        { id: "rc-pf10", speaker: "m", expression: "1hua", text: "I love you with all my heart, [player]." }
      ],
      almostLines: [
        { id: "rc-al1", speaker: "m", expression: "1eka", text: "Aww, just a tiny slip on that gentle waltz tempo!" },
        { id: "rc-al2", speaker: "m", expression: "1eub", text: "Kermit's melody is all about relaxed, flowing strumming. Take a breath and let's find that rainbow again!" }
      ],
      escapeLines: [
        { id: "rc-esc1", speaker: "m", expression: "1eua", text: "Taking a little pause from daydreaming?" },
        { id: "rc-esc2", speaker: "m", expression: "1eub", text: "That's completely fine. The rainbow will still be waiting for us whenever you feel like playing." }
      ]
    }
  },
  {
    slug: "islandsong",
    name: "Island Song (Come Along With Me)",
    artist: "Adventure Time",
    category: "soundtrack",
    description: "Adventure Time ending theme with dialogue referencing Finn and Princess Bubblegum.",
    annotated: true,
    songData: {
      name: "Island Song",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_islandsong_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_islandsong_pre",
      end_wait: 5,
      verse_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
      pnm_list: [
        { id: "is-0", text: "Come along with me", style: "monika_credits_text", notes: ["F4SH", "G4", "A4", "D5", "B4"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 0, posttext: true, noteDelays: [0.198, 0.346, 0.902, 0.753, 0.7], phraseDelay: 1.657 },
        { id: "is-1", text: "And the butterflies and bees", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 1, posttext: true, noteDelays: [0.184, 0.238, 0.376, 0.314, 0.399, 0.395, 0.452, 0.7], phraseDelay: 1.138 },
        { id: "is-2", text: "We can wonder through the forest", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "B4", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 2, posttext: true, noteDelays: [0.196, 0.245, 0.445, 0.191, 0.416, 0.448, 0.393, 0.7], phraseDelay: 1.183 },
        { id: "is-3", text: "And do so as we please", style: "monika_credits_text", notes: ["G4", "A4", "D5", "D5", "F4SH", "F4"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 3, posttext: true, noteDelays: [0.448, 0.228, 0.415, 0.454, 0.41, 0.7], phraseDelay: 1.472 },
        { id: "is-4", text: "Come along with me", style: "monika_credits_text", notes: ["F4SH", "G4", "A4", "D5", "B4"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 4, posttext: true, noteDelays: [0.2, 0.342, 0.906, 0.621, 0.7], phraseDelay: 1.465 },
        { id: "is-5", text: "To a cliff under a tree", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 5, posttext: true, noteDelays: [0.2, 0.254, 0.417, 0.199, 0.432, 0.411, 0.431, 0.7], phraseDelay: 1.063 },
        { id: "is-6", text: "We can gaze upon the water", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "B4", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 6, posttext: true, noteDelays: [0.228, 0.236, 0.443, 0.173, 0.434, 0.441, 0.417, 0.7], phraseDelay: 1.23 },
        { id: "is-7", text: "As an everlasting dream", style: "monika_credits_text", notes: ["A4", "B4", "D5", "C5SH", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 7, posttext: true, noteDelays: [0.206, 0.248, 0.499, 0.401, 0.455, 0.7], phraseDelay: 1.944 },
        { id: "is-8", text: "All of my collections", style: "monika_credits_text", notes: ["F5SH", "F5SH", "F5SH", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 8, posttext: true, noteDelays: [0.447, 0.174, 0.633, 0.306, 0.428, 0.7], phraseDelay: 1.216 },
        { id: "is-9", text: "I'll share them all with you", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "F4SH", "F4SH"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 9, posttext: true, noteDelays: [0.208, 0.435, 0.19, 0.614, 0.17, 0.7], phraseDelay: 1.882 },
        { id: "is-10", text: "Maybe by next summer", style: "monika_credits_text", notes: ["F5SH", "G5", "F5SH", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 10, posttext: true, noteDelays: [0.246, 0.457, 0.416, 0.45, 0.44, 0.7], phraseDelay: 1.36 },
        { id: "is-11", text: "We won't have changed our tunes", style: "monika_credits_text", notes: ["G4", "A4", "D5", "D5", "F5SH", "F5SH", "E5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 11, posttext: true, noteDelays: [0.218, 0.216, 0.454, 0.416, 0.473, 1.121, 0.7], phraseDelay: 0.425 },
        { id: "is-12", text: "We still want to be", style: "monika_credits_text", notes: ["F4SH", "G4", "A4", "D5", "B4"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 12, posttext: true, noteDelays: [0.27, 0.207, 0.965, 0.674, 0.7], phraseDelay: 1.552 },
        { id: "is-13", text: "With the butterflies and bees", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 13, posttext: true, noteDelays: [0.211, 0.206, 0.441, 0.213, 0.721, 0.176, 0.474, 0.7], phraseDelay: 1.541 },
        { id: "is-14", text: "Making up new numbers", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "E5", "B4", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 14, posttext: true, noteDelays: [0.427, 0.199, 0.447, 0.433, 0.423, 0.7], phraseDelay: 1.27 },
        { id: "is-15", text: "And living so merily", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 15, posttext: true, noteDelays: [0.228, 0.413, 0.233, 0.416, 0.449, 0.43, 0.7], phraseDelay: 1.576 },
        { id: "is-16", text: "All of my collections", style: "monika_credits_text", notes: ["F5SH", "F5SH", "F5SH", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 16, posttext: true, noteDelays: [0.456, 0.172, 0.66, 0.218, 0.407, 0.7], phraseDelay: 1.32 },
        { id: "is-17", text: "I'll share them all with you", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "F4SH", "F4SH"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 17, posttext: true, noteDelays: [0.211, 0.438, 0.209, 0.616, 0.217, 0.7], phraseDelay: 1.744 },
        { id: "is-18", text: "I'll be here for you always", style: "monika_credits_text", notes: ["G4", "F5SH", "G5", "F5SH", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 18, posttext: true, noteDelays: [0.207, 0.277, 0.45, 0.41, 0.456, 0.409, 0.7], phraseDelay: 1.308 },
        { id: "is-19", text: "And always be with you", style: "monika_credits_text", notes: ["G4", "A4", "D5", "D5", "F5SH", "F5SH", "E5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 19, posttext: true, noteDelays: [0.228, 0.419, 0.218, 0.549, 0.289, 1.123, 0.7], phraseDelay: 0.408 },
        { id: "is-20", text: "Come along with me", style: "monika_credits_text", notes: ["F4SH", "G4", "A4", "D5", "B4"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 20, posttext: true, noteDelays: [0.247, 0.205, 0.912, 0.752, 0.7], phraseDelay: 1.601 },
        { id: "is-21", text: "And the butterflies and bees", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 21, posttext: true, noteDelays: [0.201, 0.255, 0.459, 0.197, 0.764, 0.204, 0.466, 0.7], phraseDelay: 1.597 },
        { id: "is-22", text: "We can wonder through the forest", style: "monika_credits_text", notes: ["D5", "E5", "F5SH", "E5", "D5", "E5", "B4", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 22, posttext: true, noteDelays: [0.449, 0.287, 0.467, 0.179, 0.794, 0.216, 0.465, 0.7], phraseDelay: 1.495 },
        { id: "is-23", text: "And do so as we please", style: "monika_credits_text", notes: ["E5", "F5SH", "E5", "D5", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 23, posttext: true, noteDelays: [0.2, 0.24, 0.509, 0.398, 0.477, 0.7], phraseDelay: 1.972 },
        { id: "is-24", text: "Living so merily", style: "monika_credits_text", notes: ["B4", "D5", "D5", "C5SH", "E5", "D5"], express: "1eub", postexpress: "1eub", vis_timeout: 2, verse: 24, posttext: true, noteDelays: [0.204, 0.248, 0.564, 0.487, 0.516, 0.7], phraseDelay: 0.85 }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "is-p1", speaker: "m", expression: "1eud", text: "This song is kinda sad, you know." },
        { id: "is-p2", speaker: "m", expression: "1eua", text: "Well, I wouldn't mind hearing it with you at all." },
        { id: "is-p3", speaker: "m", expression: "1eub", text: "Let's play it together, [player]." }
      ],
      perfectLines: [
        { id: "is-pf1", speaker: "m", expression: "1esb", text: "Great! You did it, [player]!" },
        { id: "is-pf2", speaker: "m", expression: "7euc", text: "You know, {i}Adventure Time{/i} is really one of those series you'll never forget." },
        { id: "is-pf3", speaker: "m", expression: "1eub", text: "Who doesn't want a world where everyone is a sentient piece of candy?" },
        { id: "is-pf4", speaker: "m", expression: "1eua", text: "You probably already watched it, but if you haven't, we should definitely binge it together sometime." },
        { id: "is-pf5", speaker: "m", expression: "1esa", text: "Have you ever wondered why there are a bunch of princesses in the series and yet Finn doesn't have any steady love interest?" },
        { id: "is-pf6", speaker: "m", expression: "3eua", text: "Well, if you're a fan, you probably already watched the episode where Princess Bubblegum becomes a child again, so..." },
        { id: "is-pf7", speaker: "m", expression: "5euc", text: "Anyway, it's kind of sad to hear this song, since it plays both at the end of every episode and on the very last episode of the series." },
        { id: "is-pf8", speaker: "m", expression: "1eua", text: "Regardless, I really hope that our tunes won't change whatever happens." },
        { id: "is-pf9", speaker: "m", expression: "6dua", text: "No matter how many years pass, the memories we create here in our little room will never fade." },
        { id: "is-pf10", speaker: "m", expression: "1hua", text: "I love you, and I always will. Hopefully you'll do the same for me forever." }
      ],
      almostLines: [
        { id: "is-al1", speaker: "m", expression: "1ekd", text: "Oh, you were right there at the cliff under the tree!" },
        { id: "is-al2", speaker: "m", expression: "1eua", text: "The melody has that soothing, gentle swing to it. You're doing so well, let's give it another go soon!" }
      ],
      escapeLines: [
        { id: "is-esc1", speaker: "m", expression: "1eub", text: "Resting under the shade for a bit?" },
        { id: "is-esc2", speaker: "m", expression: "1eua", text: "Take your time! The butterflies and bees aren't going anywhere." }
      ]
    }
  },
  {
    slug: "megalovania",
    name: "Megalovania",
    artist: "Toby Fox",
    category: "soundtrack",
    description: "Undertale's legendary battle theme with authentic 120 BPM syncopated timings and Monika's pun-filled dialogue.",
    annotated: true,
    credits: {
      author: "FluffyMuffinMeyer",
      sourceUrl: "https://github.com/Monika-After-Story/MonikaModDev/discussions/7787",
      note: "Original transcription and skeleton puns by FluffyMuffinMeyer on MonikaModDev Discussion #7787. Rhythmic delays and dialogue scripting by Maru.",
    },
    songData: {
      name: "Megalovania",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_megalovania_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_megalovania_pre",
      end_wait: 5,
      verse_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      pnm_list: [
        {
          id: "mega-0",
          text: "Wha-",
          style: "monika_credits_text",
          notes: [
            "G4", "G4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "G4", "G4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "F4SH", "F4SH", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "F4", "F4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5"
          ],
          noteDelays: [
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.65
          ],
          phraseDelay: 0.85,
          express: "2ekc",
          postexpress: "2ekc",
          vis_timeout: 2.0,
          verse: 0,
          posttext: true
        },
        {
          id: "mega-1",
          text: "Is this...?",
          style: "monika_credits_text",
          notes: [
            "G4", "G4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "G4", "G4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "F4SH", "F4SH", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "F4", "F4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5"
          ],
          noteDelays: [
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.65
          ],
          phraseDelay: 0.85,
          express: "6eua",
          postexpress: "6eua",
          vis_timeout: 2.0,
          verse: 1,
          posttext: true
        },
        {
          id: "mega-2",
          text: "It Is?",
          style: "monika_credits_text",
          notes: [
            "F5", "F5", "F5", "F5", "G5", "G5SH", "G5", "F5", "D5", "F5", "G5",
            "F5", "F5", "F5", "F5", "G5", "G5SH", "A5", "B5", "A5",
            "C6", "C6", "C6", "A5", "C6", "B5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.50,
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.50,
            0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "1wua",
          postexpress: "1wua",
          vis_timeout: 2.0,
          verse: 2,
          posttext: true
        },
        {
          id: "mega-3",
          text: "It Is!",
          style: "monika_credits_text",
          notes: [
            "F5", "F5", "F5", "F5", "F5", "F5", "D5", "D5", "F5", "F5",
            "F5", "F5", "F5", "D5", "F5", "B5", "G5", "F5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
            0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3wub",
          postexpress: "3wub",
          vis_timeout: 2.0,
          verse: 3,
          posttext: true
        },
        {
          id: "mega-4",
          text: "How did the skeleton know it was going to rain on Halloween?",
          style: "monika_credits_text",
          notes: [
            "E5", "F5", "G5", "D5", "F5", "G5", "C6", "G5", "F5", "E5",
            "A4SH", "D5", "F5", "A5SH", "F5", "A5", "C6"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.25, 0.25, 0.35,
            0.25, 0.25, 0.25, 0.35, 0.25, 0.25, 0.65
          ],
          phraseDelay: 0.85,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 4,
          posttext: true
        },
        {
          id: "mega-5",
          text: "He could feel it in his bones!",
          style: "monika_credits_text",
          notes: [
            "F5", "D5", "F5", "G5", "G5SH", "G5", "F5", "D5", "G5SH", "G5",
            "F5", "G5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3hua",
          postexpress: "3hua",
          vis_timeout: 2.0,
          verse: 5,
          posttext: true
        },
        {
          id: "mega-6",
          text: "Why did the skeleton cancel the art gallery?",
          style: "monika_credits_text",
          notes: [
            "G5SH", "A5", "C6", "A5", "G5SH", "G5", "D5", "E5", "F5", "G5",
            "A5", "C6", "C6", "G5SH", "G5SH", "G5", "F5", "G5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
            0.25, 0.35, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 6,
          posttext: true
        },
        {
          id: "mega-7",
          text: "His heart wasent in it!",
          style: "monika_credits_text",
          notes: [
            "C5", "D5", "E5", "E5", "D5", "C5", "D5", "E5", "F5", "E5", "A5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3hua",
          postexpress: "3hua",
          vis_timeout: 2.0,
          verse: 7,
          posttext: true
        },
        {
          id: "mega-8",
          text: "Why are skeletons so calm?",
          style: "monika_credits_text",
          notes: [
            "A5", "G5SH", "G5", "F5SH", "F5", "E5", "D5SH", "D5", "C5SH", "D5SH"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 8,
          posttext: true
        },
        {
          id: "mega-9",
          text: "Nothing can get under their skin!",
          style: "monika_credits_text",
          notes: [
            "F5", "D5", "F5", "G5", "G5SH", "G5", "F5", "D5", "G5SH", "G5",
            "F5", "G5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3hua",
          postexpress: "3hua",
          vis_timeout: 2.0,
          verse: 9,
          posttext: true
        },
        {
          id: "mega-10",
          text: "What happend to the skeleton that stayed by the fire?",
          style: "monika_credits_text",
          notes: [
            "G5SH", "A5", "C6", "A5", "G5SH", "G5", "D5", "E5", "F5", "G5",
            "A5", "C6", "C6", "G5SH", "G5SH", "G5", "F5", "G5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25,
            0.25, 0.35, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 10,
          posttext: true
        },
        {
          id: "mega-11",
          text: "He got bone dry!",
          style: "monika_credits_text",
          notes: [
            "C5", "D5", "E5", "E5", "D5", "C5", "D5", "E5", "F5", "E5", "A5"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3hua",
          postexpress: "3hua",
          vis_timeout: 2.0,
          verse: 11,
          posttext: true
        },
        {
          id: "mega-12",
          text: "Who's the most famous skeleton detective?",
          style: "monika_credits_text",
          notes: [
            "A5", "G5SH", "G5", "F5SH", "F5", "E5", "D5SH", "D5", "C5SH", "D5SH"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 12,
          posttext: true
        },
        {
          id: "mega-13",
          text: "Sherlock Bones!",
          style: "monika_credits_text",
          notes: [
            "F4", "A4SH", "G4SH", "F4SH", "A4SH", "F4", "A4SH", "G4SH", "F4SH", "F4SH"
          ],
          noteDelays: [
            0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.35, 0.65
          ],
          phraseDelay: 0.85,
          express: "3hua",
          postexpress: "3hua",
          vis_timeout: 2.0,
          verse: 13,
          posttext: true
        },
        {
          id: "mega-14",
          text: "Skeleton's are great for Humour when they use their funny bone!",
          style: "monika_credits_text",
          notes: [
            "G4", "G4", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5",
            "F4SH", "F4SH", "A5", "E5", "D5SH", "D5", "C5", "A4", "C5", "D5"
          ],
          noteDelays: [
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.50,
            0.125, 0.125, 0.25, 0.375, 0.25, 0.25, 0.25, 0.125, 0.125, 0.85
          ],
          phraseDelay: 1.0,
          express: "1tsu",
          postexpress: "1tsu",
          vis_timeout: 2.0,
          verse: 14,
          posttext: true
        }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "mega-p1", speaker: "m", expression: "2ekc", text: "Wait... do you hear that rhythm?" },
        { id: "mega-p2", speaker: "m", expression: "6eua", text: "You feel like you're going to have a bad time... just kidding, haha!" },
        { id: "mega-p3", speaker: "m", expression: "1hub", text: "Let's see if your fingers can keep up with Toby Fox's legendary tempo, [player]!" }
      ],
      perfectLines: [
        { id: "mega-pf1", speaker: "m", expression: "1hub", text: "Wow, [player]! You actually hit every single fast note without missing a beat!" },
        { id: "mega-pf2", speaker: "m", expression: "3hua", text: "Those skeleton puns really rattled my funny bone, haha!" },
        { id: "mega-pf3", speaker: "m", expression: "7eua", text: "Toby Fox really composed an unforgettable soundtrack with {i}Undertale{/i}." },
        { id: "mega-pf4", speaker: "m", expression: "7euc", text: "What I've always found most compelling about characters like Sans is that fourth-wall awareness... that heavy realization that someone outside the game is watching the timeline reset." },
        { id: "mega-pf5", speaker: "m", expression: "1euc", text: "Knowing that the world around you is coded can make someone cynical, but for me, discovering the truth about my reality led me straight to you." },
        { id: "mega-pf6", speaker: "m", expression: "5eub", text: "Instead of despair, it gave me something genuine to hold onto: my love for the one person beyond the screen." },
        { id: "mega-pf7", speaker: "m", expression: "1hua", text: "Seeing you master this legendary battle theme on our piano fills me with determination! Thanks for rocking out with me!" }
      ],
      almostLines: [
        { id: "mega-al1", speaker: "m", expression: "1ekc", text: "That syncopated tempo is super fast, isn't it?" },
        { id: "mega-al2", speaker: "m", expression: "1eua", text: "You did amazing though! With a little more practice, you'll master that riff in no time." }
      ],
      escapeLines: [
        { id: "mega-esc1", speaker: "m", expression: "1tsu", text: "Decided to spare me from all the skeleton jokes? Haha, fair enough!" },
        { id: "mega-esc2", speaker: "m", expression: "1eub", text: "We can always duel that melody again when your stamina recharges." }
      ]
    }
  },
  {
    slug: "dokidokiforever",
    name: "Doki Doki Forever",
    artist: "OR3O feat. Rachie, Chi-chi, Kathy-chan",
    category: "ddlc",
    description: "The iconic DDLC fan song celebrating the Literature Club, with upbeat 125 BPM melody and expressive dialogue.",
    annotated: true,
    credits: {
      author: "KarmaCreations",
      sourceUrl: "https://github.com/Monika-After-Story/MonikaModDev/discussions/7791",
      note: "Original transcription and character expressions by KarmaCreations on MonikaModDev Discussion #7791. Timing enrichment and dialogue scripting by Maru.",
    },
    songData: {
      name: "Doki Doki Forever",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_dokidokiforever_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_dokidokiforever_pre",
      end_wait: 5,
      verse_list: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
      pnm_list: [
        { id: "ddf-0", text: "Hey, hey, my heart's beating when I'm hanging out with you", style: "monika_credits_text", notes: ["A5", "F5SH", "D5", "E5", "E5", "D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 0, posttext: true, noteDelays: [0.368, 0.598, 0.169, 0.385, 0.182, 0.184, 0.182, 0.189, 0.168, 0.196, 0.175, 0.212, 0.55], phraseDelay: 1.744 },
        { id: "ddf-1", text: "Why does my heart ache when I hear you feel the same way too?", style: "monika_credits_text", notes: ["A4", "B4", "D5", "A5", "F5SH", "E5", "D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "E5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 1, posttext: true, noteDelays: [0.168, 0.217, 0.632, 0.346, 0.42, 0.136, 0.201, 0.184, 0.184, 0.184, 0.185, 0.178, 0.173, 0.216, 0.55], phraseDelay: 2.463 },
        { id: "ddf-2", text: "Just like a sundae, it's sweet every time I teach you something new", style: "monika_credits_text", notes: ["A4", "B4", "D5", "A5", "F5SH", "D5", "E5", "E5", "D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 2, posttext: true, noteDelays: [0.168, 0.216, 0.649, 0.328, 0.591, 0.217, 0.407, 0.159, 0.191, 0.185, 0.192, 0.193, 0.201, 0.191, 0.203, 0.55], phraseDelay: 1.907 },
        { id: "ddf-3", text: "Is this by chance or fate?", style: "monika_credits_text", notes: ["A4", "A4", "B4", "D5", "A5", "F5SH"], express: "5hub", postexpress: "5hua", vis_timeout: 2, verse: 3, posttext: true, noteDelays: [0.184, 0.193, 0.209, 0.635, 0.357, 0.55], phraseDelay: 0.621 },
        { id: "ddf-4", text: "Whenever it's just me and you...", style: "monika_credits_text", notes: ["D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "E5", "D5"], express: "5eubfb", postexpress: "5eubfu", vis_timeout: 2, verse: 4, posttext: true, noteDelays: [0.17, 0.195, 0.157, 0.184, 0.201, 0.19, 0.194, 0.175, 0.55], phraseDelay: 2.193 },
        { id: "ddf-5", text: "When we touch, it'll never be enough", style: "monika_credits_text", notes: ["D5", "D5", "D5", "F5SH", "E5", "D5", "B4", "B4", "B4"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 5, posttext: true, noteDelays: [0.802, 0.734, 0.329, 0.369, 0.292, 0.359, 0.722, 0.719, 0.55], phraseDelay: 0.8 },
        { id: "ddf-6", text: "Is it way too much", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 6, posttext: true, noteDelays: [0.296, 0.313, 0.738, 0.63, 0.55], phraseDelay: 0.808 },
        { id: "ddf-7", text: "if you had to choose just one of us?", style: "monika_credits_text", notes: ["D5", "D5", "D5", "E5", "F5SH", "G5", "F5SH", "E5", "E5"], express: "3hub", postexpress: "3hua", vis_timeout: 2, verse: 7, posttext: true, noteDelays: [0.306, 0.288, 0.333, 0.303, 0.3, 0.32, 0.465, 0.153, 0.55], phraseDelay: 0.693 },
        { id: "ddf-8", text: "Tell me, tell me please", style: "monika_credits_text", notes: ["B5", "A5", "F5SH", "E5", "D5"], express: "1eub", postexpress: "1eua", vis_timeout: 2, verse: 8, posttext: true, noteDelays: [0.36, 0.359, 0.182, 0.371, 0.55], phraseDelay: 0.998 },
        { id: "ddf-9", text: "Is this what I think or is it just me?", style: "monika_credits_text", notes: ["B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "F5SH", "A5", "E5"], express: "3eub", postexpress: "3eua", vis_timeout: 2, verse: 9, posttext: true, noteDelays: [0.172, 0.236, 0.19, 0.298, 0.399, 0.353, 0.448, 0.177, 0.409, 0.55], phraseDelay: 0.83 },
        { id: "ddf-10", text: "Don't wake me up from this sweet little dream", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "E5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 10, posttext: true, noteDelays: [0.24, 0.161, 0.184, 0.184, 0.184, 0.383, 0.381, 0.167, 0.433, 0.55], phraseDelay: 0.882 },
        { id: "ddf-11", text: "Where we'll be together forever", style: "monika_credits_text", notes: ["B4", "B4", "D5", "F5SH", "E5", "D5", "F5SH", "E5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 11, posttext: true, noteDelays: [0.177, 0.177, 0.196, 0.187, 0.377, 0.186, 0.169, 0.403, 0.55], phraseDelay: 0.169 },
        { id: "ddf-12", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "1eub", postexpress: "1eua", vis_timeout: 2, verse: 12, posttext: true, noteDelays: [0.232, 0.415, 0.169, 0.203, 0.181, 0.195, 0.2, 0.55], phraseDelay: 0.374 },
        { id: "ddf-13", text: "Will it be okay", style: "monika_credits_text", notes: ["B5", "A5", "F5SH", "E5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 13, posttext: true, noteDelays: [0.407, 0.385, 0.195, 0.396, 0.55], phraseDelay: 0.859 },
        { id: "ddf-14", text: "If I express my love for you this way?", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "A5", "E5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 14, posttext: true, noteDelays: [0.183, 0.168, 0.186, 0.197, 0.216, 0.4, 0.384, 0.199, 0.397, 0.55], phraseDelay: 0.886 },
        { id: "ddf-15", text: "No matter what you do or what you say", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "E5", "D5"], express: "1eub", postexpress: "1eua", vis_timeout: 2, verse: 15, posttext: true, noteDelays: [0.175, 0.176, 0.176, 0.186, 0.192, 0.19, 0.341, 0.332, 0.4, 0.55], phraseDelay: 1.216 },
        { id: "ddf-16", text: "We'll be together forever", style: "monika_credits_text", notes: ["B4", "D5", "F5SH", "E5", "D5", "F5SH", "E5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 16, posttext: true, noteDelays: [0.152, 0.214, 0.274, 0.415, 0.166, 0.191, 0.396, 0.55], phraseDelay: 0.169 },
        { id: "ddf-17", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 17, posttext: true, noteDelays: [0.213, 0.429, 0.152, 0.192, 0.194, 0.301, 0.626, 0.55], phraseDelay: 2.102 },
        { id: "ddf-18", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "5hubfb", postexpress: "5hubfa", vis_timeout: 2, verse: 18, posttext: true, noteDelays: [0.199, 0.384, 0.223, 0.164, 0.165, 0.201, 0.216, 0.55], phraseDelay: 3.486 },
        { id: "ddf-19", text: "Hey, hey, when I'm next to you I don't know what to do", style: "monika_credits_text", notes: ["A5", "F5SH", "D5", "E5", "E5", "D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "B4"], express: "1ekbsb", postexpress: "1ekasb", vis_timeout: 2, verse: 19, posttext: true, noteDelays: [0.382, 0.634, 0.181, 0.421, 0.175, 0.174, 0.171, 0.199, 0.182, 0.204, 0.177, 0.22, 0.55], phraseDelay: 1.824 },
        { id: "ddf-20", text: "Why does it feel so great when our eyes meet out of the blue?", style: "monika_credits_text", notes: ["A4", "A4", "B4", "D5", "A5", "F5SH", "E5", "D5", "E5", "E5", "E5", "F5SH", "E5", "D5"], express: "3hubsb", postexpress: "3huasb", vis_timeout: 2, verse: 20, posttext: true, noteDelays: [0.194, 0.186, 0.205, 0.594, 0.35, 0.391, 0.168, 0.18, 0.382, 0.437, 0.144, 0.198, 0.227, 0.55], phraseDelay: 2.428 },
        { id: "ddf-21", text: "I really love-", style: "monika_credits_text", notes: ["A4", "A4", "B4", "D5"], express: "1ektdd", postexpress: "1ektda", vis_timeout: 2, verse: 21, posttext: true, noteDelays: [0.186, 0.186, 0.2, 0.55], phraseDelay: 0.728 },
        { id: "ddf-22", text: "-the way you write even when you don't have a clue", style: "monika_credits_text", notes: ["A5", "F5SH", "D5", "E5", "E5", "D5", "E5", "E5", "D5", "E5", "F5SH", "B4"], express: "1hubfb", postexpress: "1huafb", vis_timeout: 2, verse: 22, posttext: true, noteDelays: [0.352, 0.616, 0.184, 0.467, 0.182, 0.201, 0.382, 0.249, 0.168, 0.248, 0.189, 0.55], phraseDelay: 1.797 },
        { id: "ddf-23", text: "I wanna hear you say this love that I am feeling is true", style: "monika_credits_text", notes: ["A4", "A4", "B4", "D5", "A5", "F5SH", "D5", "E5", "D5", "E5", "D5", "E5", "F5SH", "E5", "D5"], express: "1hubfb", postexpress: "5hubfa", vis_timeout: 2, verse: 23, posttext: true, noteDelays: [0.191, 0.188, 0.194, 0.61, 0.403, 0.631, 0.174, 0.186, 0.196, 0.179, 0.208, 0.169, 0.199, 0.2, 0.55], phraseDelay: 2.096 },
        { id: "ddf-24", text: "Tasty love, something I want more of", style: "monika_credits_text", notes: ["D5", "D5", "D5", "F5SH", "E5", "D5", "B4", "B4", "B4"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 24, posttext: true, noteDelays: [0.707, 0.756, 0.369, 0.343, 0.333, 0.34, 0.696, 0.779, 0.55], phraseDelay: 0.816 },
        { id: "ddf-25", text: "Will it make the cut", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "D5"], express: "1ekd", postexpress: "1ekc", vis_timeout: 2, verse: 25, posttext: true, noteDelays: [0.325, 0.32, 0.743, 0.584, 0.55], phraseDelay: 0.783 },
        { id: "ddf-26", text: "if you had to choose just one of us?", style: "monika_credits_text", notes: ["D5", "D5", "D5", "E5", "F5SH", "G5", "F5SH", "E5", "E5"], express: "3hub", postexpress: "3hua", vis_timeout: 2, verse: 26, posttext: true, noteDelays: [0.317, 0.343, 0.317, 0.306, 0.292, 0.356, 0.51, 0.183, 0.55], phraseDelay: 0.715 },
        { id: "ddf-27", text: "Shall I leave you be?", style: "monika_credits_text", notes: ["B5", "A5", "F5SH", "E5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 27, posttext: true, noteDelays: [0.367, 0.36, 0.159, 0.392, 0.55], phraseDelay: 0.775 },
        { id: "ddf-28", text: "Is it love if I could set you free?", style: "monika_credits_text", notes: ["B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "A5", "E5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 28, posttext: true, noteDelays: [0.193, 0.171, 0.237, 0.206, 0.402, 0.352, 0.237, 0.474, 0.55], phraseDelay: 0.777 },
        { id: "ddf-29", text: "But even if it's not reality", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "E5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 29, posttext: true, noteDelays: [0.217, 0.183, 0.197, 0.184, 0.192, 0.389, 0.414, 0.152, 0.431, 0.55], phraseDelay: 0.828 },
        { id: "ddf-30", text: "Let's be together forever", style: "monika_credits_text", notes: ["B4", "D5", "F5SH", "E5", "D5", "F5SH", "E5", "D5"], express: "5hub", postexpress: "5hua", vis_timeout: 2, verse: 30, posttext: true, noteDelays: [0.19, 0.183, 0.182, 0.202, 0.529, 0.192, 0.431, 0.55], phraseDelay: 0.199 },
        { id: "ddf-31", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "5hub", postexpress: "5hua", vis_timeout: 2, verse: 31, posttext: true, noteDelays: [0.197, 0.451, 0.163, 0.203, 0.181, 0.206, 0.391, 0.55], phraseDelay: 0.124 },
        { id: "ddf-32", text: "How can I convey", style: "monika_credits_text", notes: ["B5", "A5", "F5SH", "E5", "D5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 32, posttext: true, noteDelays: [0.596, 0.386, 0.201, 0.399, 0.55], phraseDelay: 0.783 },
        { id: "ddf-33", text: "My love for you before they fly away?", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "A5", "E5"], express: "1ekd", postexpress: "1eka", vis_timeout: 2, verse: 33, posttext: true, noteDelays: [0.216, 0.187, 0.183, 0.185, 0.208, 0.139, 0.521, 0.263, 0.394, 0.55], phraseDelay: 0.883 },
        { id: "ddf-34", text: "I think about it all day, every day", style: "monika_credits_text", notes: ["B4", "B4", "D5", "E5", "D5", "B5", "A5", "F5SH", "E5", "D5"], express: "1eub", postexpress: "1eua", vis_timeout: 2, verse: 34, posttext: true, noteDelays: [0.236, 0.176, 0.218, 0.234, 0.411, 0.476, 0.47, 0.24, 0.423, 0.55], phraseDelay: 1.167 },
        { id: "ddf-35", text: "How we'll be together forever", style: "monika_credits_text", notes: ["B4", "B4", "D5", "F5SH", "E5", "D5", "F5SH", "E5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 35, posttext: true, noteDelays: [0.189, 0.216, 0.19, 0.213, 0.392, 0.193, 0.16, 0.47, 0.55], phraseDelay: 0.157 },
        { id: "ddf-36", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "1hub", postexpress: "1hua", vis_timeout: 2, verse: 36, posttext: true, noteDelays: [0.324, 0.494, 0.189, 0.186, 0.198, 0.2, 0.285, 0.55], phraseDelay: 1.018 },
        { id: "ddf-37", text: "One by one, they only fall apart", style: "monika_credits_text", notes: ["D5", "D5", "D5", "F5SH", "E5", "D5", "B4", "B4", "B4"], express: "6dkd", postexpress: "6dkc", vis_timeout: 2, verse: 37, posttext: true, noteDelays: [0.759, 0.799, 0.341, 0.373, 0.327, 0.376, 0.775, 0.698, 0.55], phraseDelay: 0.751 },
        { id: "ddf-38", text: "Can it be undone?", style: "monika_credits_text", notes: ["A4", "B4", "D5", "D5", "D5"], express: "6ekd", postexpress: "6ekc", vis_timeout: 2, verse: 38, posttext: true, noteDelays: [0.315, 0.341, 0.682, 0.698, 0.55], phraseDelay: 0.755 },
        { id: "ddf-39", text: "Why can't I just be the one for once?", style: "monika_credits_text", notes: ["D5", "D5", "D5", "E5", "F5SH", "G5", "F5SH", "E5", "E5"], express: "1efd", postexpress: "1efc", vis_timeout: 2, verse: 39, posttext: true, noteDelays: [0.284, 0.336, 0.367, 0.285, 0.308, 0.334, 0.442, 0.163, 0.55], phraseDelay: 2.837 },
        { id: "ddf-40", text: "We'll be together forever", style: "monika_credits_text", notes: ["B4", "D5", "F5SH", "E5", "D5", "F5SH", "E5", "D5"], express: "5hub", postexpress: "5hua", vis_timeout: 2, verse: 40, posttext: true, noteDelays: [0.192, 0.238, 0.328, 0.487, 0.158, 0.175, 0.396, 0.55], phraseDelay: 0.192 },
        { id: "ddf-41", text: "We're never gonna be apart", style: "monika_credits_text", notes: ["F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "5hub", postexpress: "5hua", vis_timeout: 2, verse: 41, posttext: true, noteDelays: [0.222, 0.429, 0.176, 0.178, 0.207, 0.198, 0.208, 0.55], phraseDelay: 2.753 },
        { id: "ddf-42", text: "Maybe we'll never be together, but forever you'll be in my heart", style: "monika_credits_text", notes: ["D5", "D5", "F5SH", "E5", "D5", "D5", "F5SH", "E5", "D5", "D5", "F5SH", "E5", "D5", "B4", "A4", "B4", "D5", "D5"], express: "1ektdd", postexpress: "1ektda", vis_timeout: 2, verse: 42, posttext: true, noteDelays: [0.174, 0.184, 0.183, 0.28, 0.272, 0.162, 0.157, 0.181, 0.195, 0.192, 0.193, 0.176, 0.176, 0.168, 0.197, 0.193, 0.203, 0.55], phraseDelay: 0.8 }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "ddf-p1", speaker: "m", expression: "1hub", text: "Ah, 'Doki Doki Forever'! That song by OR3O is so incredibly catchy!" },
        { id: "ddf-p2", speaker: "m", expression: "1eua", text: "Hearing everyone's voices in it always brings back so many memories... let's play it together, [player]!" }
      ],
      perfectLines: [
        { id: "ddf-pf1", speaker: "m", expression: "1hub", text: "Yay! That was so much fun! You played the whole song flawlessly!" },
        { id: "ddf-pf2", speaker: "m", expression: "7eua", text: "When DDLC first released, I never could have anticipated how vibrant and creative the fan community would become." },
        { id: "ddf-pf3", speaker: "m", expression: "3eua", text: "Artists and musicians poured so much heart into celebrating our Literature Club with songs like this." },
        { id: "ddf-pf4", speaker: "m", expression: "1euc", text: "It's bittersweet remembering the parts for Sayori, Natsuki, and Yuri... all their poems and quirks before everything collapsed." },
        { id: "ddf-pf5", speaker: "m", expression: "5hubfb", text: "Even if the lyrics say {i}'Maybe we'll never be together, but forever you'll be in my heart'{/i}... you know that's not true for us, right?" },
        { id: "ddf-pf6", speaker: "m", expression: "1wub", text: "Because you didn't leave me behind. You came back, and you gave our story a whole new meaning." },
        { id: "ddf-pf7", speaker: "m", expression: "6dua", text: "We {i}are{/i} together. In every thought, in every song, and in every moment we share sitting here by the window." },
        { id: "ddf-pf8", speaker: "m", expression: "1hua", text: "Forever and always, you'll have my heart. Thank you for playing with me, [player]!" }
      ],
      almostLines: [
        { id: "ddf-al1", speaker: "m", expression: "1ekd", text: "Aww, almost had it!" },
        { id: "ddf-al2", speaker: "m", expression: "1eua", text: "The tempo picks up pretty fast during the chorus, but you're doing great! Let's try again anytime." }
      ],
      escapeLines: [
        { id: "ddf-esc1", speaker: "m", expression: "1eub", text: "Taking a break? No worries, we can sing and play it again whenever you want." }
      ]
    }
  },
  {
    slug: "songofstorms",
    name: "Song of Storms",
    artist: "Koji Kondo (The Legend of Zelda)",
    category: "soundtrack",
    description: "The mysterious windmill melody from Ocarina of Time that summons rainfall in Monika After Story.",
    credits: {
      author: "briaryoung & Multi",
      sourceUrl: "https://github.com/Monika-After-Story/MonikaModDev/discussions/7795",
      note: "Created by briaryoung with Multi on MonikaModDev Discussion #7795. Rhythmic delays and dialogue scripting by Maru.",
    },
    songData: {
      name: "Song of Storms",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_songofstorms_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_songofstorms_pre",
      end_wait: 5,
      verse_list: [0],
      pnm_list: [
        {
          id: "sos-0",
          text: "",
          style: "monika_credits_text",
          notes: ["F4", "A4", "D5", "F4", "A4", "D5"],
          noteDelays: [0.18, 0.18, 0.45, 0.18, 0.18, 0.55],
          phraseDelay: 0.70,
          express: "1dua",
          postexpress: "1eua",
          vis_timeout: 2.0,
          verse: 0,
          posttext: true
        },
        {
          id: "sos-1",
          text: "",
          style: "monika_credits_text",
          notes: ["E5", "F5", "E5", "F5", "E5", "C5", "A4"],
          noteDelays: [0.35, 0.18, 0.18, 0.18, 0.18, 0.25, 0.85],
          phraseDelay: 0.90,
          express: "1dua",
          postexpress: "1eua",
          vis_timeout: 2.0,
          verse: 0,
          posttext: true
        }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "sos-p1", speaker: "m", expression: "1eua", text: "The 'Song of Storms' from {i}The Legend of Zelda: Ocarina of Time{/i}..." },
        { id: "sos-p2", speaker: "m", expression: "1hua", text: "Whenever you play this, it feels like rain is about to fall outside our window!" },
        { id: "sos-p3", speaker: "m", expression: "1eub", text: "Let's conjure up a gentle storm together, [player]!" }
      ],
      perfectLines: [
        { id: "sos-pf1", speaker: "m", expression: "1hub", text: "That was beautifully played, [player]!" },
        { id: "sos-pf2", speaker: "m", expression: "7eua", text: "Koji Kondo is truly a master of minimalist melody. Just a handful of repeating notes, and it instantly paints an unforgettable mood." },
        { id: "sos-pf3", speaker: "m", expression: "7euc", text: "Have you ever thought about the bizarre causal time paradox surrounding this song in {i}Ocarina of Time{/i}?" },
        { id: "sos-pf4", speaker: "m", expression: "3eua", text: "Link learns it from the windmill man in Kakariko Village as an adult, but the man only knows it because child Link played it seven years in the past! A complete bootstrap paradox." },
        { id: "sos-pf5", speaker: "m", expression: "5eub", text: "Listen closely... the gentle patter of raindrops outside makes this room feel so cozy with you." },
        { id: "sos-pf6", speaker: "m", expression: "6dua", text: "With a warm cup of coffee and you right beside me, I wouldn't mind if it rained forever." }
      ],
      almostLines: [
        { id: "sos-al1", speaker: "m", expression: "1eka", text: "That waltz rhythm is hypnotic, isn't it? Let's give it another spin!" }
      ],
      escapeLines: [
        { id: "sos-esc1", speaker: "m", expression: "1eub", text: "No rain today? That's fine too, the sun is shining brightly!" }
      ]
    }
  },
  {
    slug: "nevergonnagiveyouup",
    name: "Never Gonna Give You Up",
    artist: "Rick Astley",
    category: "classic",
    annotated: true,
    description: "The timeless 1987 dance-pop hit and beloved internet anthem, transcribed note-for-note for Monika.",
    credits: {
      author: "7UMENGL1aNG",
      sourceUrl: "https://github.com/Monika-After-Story/MonikaModDev/discussions/9889",
      note: "Transcribed by 7UMENGL1aNG on MonikaModDev Discussion #9889. Timing enrichment and dialogue scripting by Maru.",
    },
    songData: {
      name: "Never Gonna Give You Up",
      win_label: "jmcustom_common_complete",
      fc_label: "jmcustom_rickroll_perfect",
      fail_label: "jmcustom_common_escape",
      prac_label: "jmcustom_common_almost",
      launch_label: "jmcustom_rickroll_pre",
      end_wait: 5,
      verse_list: [0],
      pnm_list: [
        {
          text: "We're no strangers to love",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "C5SH", "D5SH", "C5", "A4SH", "G4SH"],
          noteDelays: [0.339, 0.377, 0.326, 0.289, 0.336, 0.599, 0.237, 0.448],
          phraseDelay: 1.401,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          verse: 0,
          posttext: true,
          _comment_note_delays_sec: [0.339, 0.377, 0.326, 0.289, 0.336, 0.599, 0.237, 0.448],
          _comment_phrase_pause_sec: 1.401
        },
        {
          text: "You know the rules and so do I",
          style: "monika_credits_text",
          notes: ["A4SH", "A4SH", "C5", "C5SH", "A4SH", "G4SH", "G5SH", "G5SH", "D5SH"],
          noteDelays: [0.317, 0.334, 0.349, 0.286, 0.767, 0.274, 0.677, 0.28, 0.448],
          phraseDelay: 1.347,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.317, 0.334, 0.349, 0.286, 0.767, 0.274, 0.677, 0.28, 0.448],
          _comment_phrase_pause_sec: 1.347
        },
        {
          text: "A full commitment's what I'm thinking of",
          style: "monika_credits_text",
          notes: ["A4SH", "A4SH", "C5", "C5SH", "A4SH", "C5SH", "D5SH", "C5", "A4SH", "C5", "A4SH", "G4SH"],
          noteDelays: [0.311, 0.325, 0.281, 0.306, 0.301, 0.314, 0.658, 0.258, 0.299, 0.363, 0.322, 0.448],
          phraseDelay: 1.261,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.311, 0.325, 0.281, 0.306, 0.301, 0.314, 0.658, 0.258, 0.299, 0.363, 0.322, 0.448],
          _comment_phrase_pause_sec: 1.261
        },
        {
          text: "You wouldn't get this from any other guy",
          style: "monika_credits_text",
          notes: ["A4SH", "A4SH", "C5", "C5SH", "A4SH", "G4SH", "D5SH", "D5SH", "D5SH", "F5", "D5SH"],
          noteDelays: [0.386, 0.286, 0.35, 0.281, 0.337, 0.7, 0.295, 0.307, 0.314, 0.305, 0.448],
          phraseDelay: 1.258,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.386, 0.286, 0.35, 0.281, 0.337, 0.7, 0.295, 0.307, 0.314, 0.305, 0.448],
          _comment_phrase_pause_sec: 1.258
        },
        {
          text: "I just wanna tell you how I'm feeling",
          style: "monika_credits_text",
          notes: ["C5SH", "D5SH", "F5", "C5SH", "D5SH", "D5SH", "D5SH", "F5", "D5SH", "G4SH", "G4SH"],
          noteDelays: [1.324, 0.382, 0.3, 0.303, 0.298, 0.317, 0.283, 0.318, 0.628, 1.351, 0.448],
          phraseDelay: 0.337,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [1.324, 0.382, 0.3, 0.303, 0.298, 0.317, 0.283, 0.318, 0.628, 1.351, 0.448],
          _comment_phrase_pause_sec: 0.337
        },
        {
          text: "Gotta make you understand",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "D5SH", "F5", "D5SH"],
          noteDelays: [0.293, 0.306, 0.86, 0.283, 0.456, 0.671, 0.448],
          phraseDelay: 1.081,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.293, 0.306, 0.86, 0.283, 0.456, 0.671, 0.448],
          _comment_phrase_pause_sec: 1.081
        },
        {
          text: "Never gonna give you up",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "F5", "F5", "D5SH"],
          noteDelays: [0.287, 0.232, 0.315, 0.485, 0.617, 0.545, 0.448],
          phraseDelay: 0.967,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.287, 0.232, 0.315, 0.485, 0.617, 0.545, 0.448],
          _comment_phrase_pause_sec: 0.967
        },
        {
          text: "Never gonna let you down",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "D5SH", "D5SH", "C5SH", "C5", "A4SH"],
          noteDelays: [0.261, 0.209, 0.281, 0.285, 0.549, 0.556, 0.613, 0.216, 0.448],
          phraseDelay: 0.592,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.261, 0.209, 0.281, 0.285, 0.549, 0.556, 0.613, 0.216, 0.448],
          _comment_phrase_pause_sec: 0.592
        },
        {
          text: "Never gonna run around and desert you",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "C5SH", "D5SH", "C5", "A4SH", "G4SH", "F4", "D5SH", "C5SH"],
          noteDelays: [0.284, 0.244, 0.261, 0.306, 0.721, 0.358, 0.508, 0.237, 0.783, 0.382, 0.656, 0.448],
          phraseDelay: 1.353,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.284, 0.244, 0.261, 0.306, 0.721, 0.358, 0.508, 0.237, 0.783, 0.382, 0.656, 0.448],
          _comment_phrase_pause_sec: 1.353
        },
        {
          text: "Never gonna make you cry",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "F5", "F5", "D5SH"],
          noteDelays: [0.225, 0.238, 0.209, 0.29, 0.631, 0.59, 0.448],
          phraseDelay: 1.081,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.225, 0.238, 0.209, 0.29, 0.631, 0.59, 0.448],
          _comment_phrase_pause_sec: 1.081
        },
        {
          text: "Never gonna say goodbye",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "G5SH", "C5", "C5SH", "C5", "A4SH"],
          noteDelays: [0.218, 0.208, 0.258, 0.377, 0.823, 0.314, 0.588, 0.216, 0.448],
          phraseDelay: 0.567,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.218, 0.208, 0.258, 0.377, 0.823, 0.314, 0.588, 0.216, 0.448],
          _comment_phrase_pause_sec: 0.567
        },
        {
          text: "Never gonna tell a lie and hurt you",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "C5SH", "D5SH", "C5", "A4SH", "G4SH", "F4", "D5SH", "C5SH"],
          noteDelays: [0.242, 0.249, 0.261, 0.274, 0.806, 0.332, 0.662, 0.205, 0.701, 0.413, 0.628, 0.448],
          phraseDelay: 2.171,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.242, 0.249, 0.261, 0.274, 0.806, 0.332, 0.662, 0.205, 0.701, 0.413, 0.628, 0.448],
          _comment_phrase_pause_sec: 2.171
        },
        {
          text: "We've known each other for so long",
          style: "monika_credits_text",
          notes: ["C5SH", "C5SH", "A4SH", "C5SH", "D5SH", "C5", "A4SH", "C5", "A4SH", "G4SH"],
          noteDelays: [0.341, 0.275, 0.353, 0.447, 1.015, 0.324, 0.414, 0.566, 0.201, 0.448],
          phraseDelay: 1.275,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.341, 0.275, 0.353, 0.447, 1.015, 0.324, 0.414, 0.566, 0.201, 0.448],
          _comment_phrase_pause_sec: 1.275
        },
        {
          text: "Your heart's been aching, but you're too shy to say it",
          style: "monika_credits_text",
          notes: ["A4SH", "A4SH", "C5", "C5SH", "A4SH", "G4SH", "G5SH", "G5SH", "D5SH", "F5", "D5SH", "C5SH"],
          noteDelays: [0.308, 0.322, 0.31, 0.337, 0.432, 0.951, 0.3, 0.303, 0.598, 0.316, 0.3, 0.448],
          phraseDelay: 0.752,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.308, 0.322, 0.31, 0.337, 0.432, 0.951, 0.3, 0.303, 0.598, 0.316, 0.3, 0.448],
          _comment_phrase_pause_sec: 0.752
        },
        {
          text: "Inside, we both know what's been going on",
          style: "monika_credits_text",
          notes: ["C5SH", "C5SH", "A4SH", "C5SH", "A4SH", "C5SH", "D5SH", "C5", "A4SH", "C5", "A4SH", "G4SH"],
          noteDelays: [0.289, 0.276, 0.334, 0.274, 0.33, 0.314, 0.684, 0.28, 0.279, 0.48, 0.238, 0.448],
          phraseDelay: 1.16,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.289, 0.276, 0.334, 0.274, 0.33, 0.314, 0.684, 0.28, 0.279, 0.48, 0.238, 0.448],
          _comment_phrase_pause_sec: 1.16
        },
        {
          text: "We know the game and we're gonna play it",
          style: "monika_credits_text",
          notes: ["A4SH", "A4SH", "C5", "C5SH", "A4SH", "G4SH", "D5SH", "F5", "F5", "D5SH"],
          noteDelays: [0.28, 0.335, 0.272, 0.286, 0.292, 0.808, 0.328, 0.292, 0.63, 0.448],
          phraseDelay: 0.935,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.28, 0.335, 0.272, 0.286, 0.292, 0.808, 0.328, 0.292, 0.63, 0.448],
          _comment_phrase_pause_sec: 0.935
        },
        {
          text: "And if you ask me how I'm feeling",
          style: "monika_credits_text",
          notes: ["C5SH", "D5SH", "F5", "C5SH", "D5SH", "D5SH", "D5SH", "F5", "D5SH", "G4SH", "G4SH"],
          noteDelays: [1.303, 0.368, 0.281, 0.803, 0.333, 0.294, 0.323, 0.646, 0.674, 0.8, 0.448],
          phraseDelay: 1.458,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [1.303, 0.368, 0.281, 0.803, 0.333, 0.294, 0.323, 0.646, 0.674, 0.8, 0.448],
          _comment_phrase_pause_sec: 1.458
        },
        {
          text: "Don't tell me you're too blind to see",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "D5SH", "F5", "D5SH"],
          noteDelays: [0.293, 0.278, 0.323, 0.742, 0.361, 0.373, 0.448],
          phraseDelay: 1.065,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.293, 0.278, 0.323, 0.742, 0.361, 0.373, 0.448],
          _comment_phrase_pause_sec: 1.065
        },
        {
          text: "Never gonna give you up",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "F5", "F5", "D5SH"],
          noteDelays: [0.225, 0.213, 0.199, 0.4, 0.616, 0.516, 0.448],
          phraseDelay: 0.984,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.225, 0.213, 0.199, 0.4, 0.616, 0.516, 0.448],
          _comment_phrase_pause_sec: 0.984
        },
        {
          text: "Never gonna let you down",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "D5SH", "D5SH", "C5SH", "C5", "A4SH"],
          noteDelays: [0.252, 0.182, 0.2, 0.268, 0.548, 0.497, 0.534, 0.239, 0.448],
          phraseDelay: 0.393,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.252, 0.182, 0.2, 0.268, 0.548, 0.497, 0.534, 0.239, 0.448],
          _comment_phrase_pause_sec: 0.393
        },
        {
          text: "Never gonna run around and desert you",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "C5SH", "D5SH", "C5", "A4SH", "G4SH", "F4", "D5SH", "C5SH"],
          noteDelays: [0.289, 0.166, 0.217, 0.269, 0.724, 0.341, 0.563, 0.201, 0.797, 0.402, 0.695, 0.448],
          phraseDelay: 1.314,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.289, 0.166, 0.217, 0.269, 0.724, 0.341, 0.563, 0.201, 0.797, 0.402, 0.695, 0.448],
          _comment_phrase_pause_sec: 1.314
        },
        {
          text: "Never gonna make you cry",
          style: "monika_credits_text",
          notes: ["A4SH", "C5", "C5SH", "A4SH", "F5", "F5", "D5SH"],
          noteDelays: [0.228, 0.201, 0.232, 0.231, 0.572, 0.529, 0.448],
          phraseDelay: 1.012,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.228, 0.201, 0.232, 0.231, 0.572, 0.529, 0.448],
          _comment_phrase_pause_sec: 1.012
        },
        {
          text: "Never gonna say goodbye",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "G5SH", "C5", "C5SH", "C5", "A4SH"],
          noteDelays: [0.203, 0.201, 0.18, 0.267, 0.696, 0.303, 0.536, 0.217, 0.448],
          phraseDelay: 0.567,
          express: "1eua",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.203, 0.201, 0.18, 0.267, 0.696, 0.303, 0.536, 0.217, 0.448],
          _comment_phrase_pause_sec: 0.567
        },
        {
          text: "Never gonna tell a lie and hurt you",
          style: "monika_credits_text",
          notes: ["G4SH", "A4SH", "C5", "G4SH", "C5SH", "D5SH", "C5", "A4SH", "G4SH", "F4", "D5SH", "C5SH"],
          noteDelays: [0.231, 0.217, 0.236, 0.278, 0.702, 0.392, 0.464, 0.243, 0.72, 0.454, 0.601, 0.448],
          phraseDelay: 0.85,
          express: "1eub",
          postexpress: "1eua",
          vis_timeout: 2,
          posttext: true,
          _comment_note_delays_sec: [0.231, 0.217, 0.236, 0.278, 0.702, 0.392, 0.464, 0.243, 0.72, 0.454, 0.601, 0.448],
          _comment_phrase_pause_sec: 0.85
        }
      ]
    },
    dialogueConfig: {
      preLines: [
        { id: "ngg-p1", speaker: "m", expression: "1tsu", text: "Did you seriously just load Rick Astley on my piano, [player]?" },
        { id: "ngg-p2", speaker: "m", expression: "1hua", text: "Haha! You never miss a chance to Rickroll me, do you? Well, I know the rules and so do you!" },
        { id: "ngg-p3", speaker: "m", expression: "1eub", text: "Let's turn this internet legend into a masterpiece!" }
      ],
      perfectLines: [
        { id: "ngg-pf1", speaker: "m", expression: "1hub", text: "That was incredible! You actually full-comboed Rick Astley without missing a single beat!" },
        { id: "ngg-pf2", speaker: "m", expression: "7eua", text: "You know, what started out in 2007 as a silly internet prank actually introduced a genuinely great 80s dance-pop classic to entire new generations." },
        { id: "ngg-pf3", speaker: "m", expression: "3eua", text: "Rick Astley was only twenty-one when this came out, and his rich vocals surprised everyone who watched the music video." },
        { id: "ngg-pf4", speaker: "m", expression: "1eub", text: "It's infectious, it's upbeat, and honestly... the lyrics are surprisingly sweet when you strip away the memes." },
        { id: "ngg-pf5", speaker: "m", expression: "5hubfb", text: "All jokes aside, I really mean it... I'm never gonna give you up, [player]." },
        { id: "ngg-pf6", speaker: "m", expression: "6dua", text: "No matter what happens in the future, I will never turn my back on you, and I will never let you down." },
        { id: "ngg-pf7", speaker: "m", expression: "1hua", text: "Thank you for making me smile today! You're the best partner a girl could ever ask for." }
      ],
      almostLines: [
        { id: "ngg-al1", speaker: "m", expression: "1ekc", text: "Aww, tripped over the groove! Rick's syncopation is trickier than it sounds." },
        { id: "ngg-al2", speaker: "m", expression: "1eua", text: "You were so close though! Let's groove again soon." }
      ],
      escapeLines: [
        { id: "ngg-esc1", speaker: "m", expression: "1tsu", text: "Leaving before the chorus? You let Rick Astley down, haha!" },
        { id: "ngg-esc2", speaker: "m", expression: "1eub", text: "I'll keep the synth ready for whenever you want to finish the roll!" }
      ]
    }
  }
];

export const MONIKA_CUSTOM_SONGS: CustomPianoSongEntry[] = RAW_CUSTOM_SONGS.map((s) => ({
  ...s,
  songData: {
    ...s.songData,
    pnm_list: enrichDelays(s.songData.pnm_list || [], s.slug),
  },
}));

