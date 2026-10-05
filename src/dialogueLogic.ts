import { DialogueStep, UserSessionData } from './types';

export interface DialogueResult {
  nextStep: DialogueStep;
  botResponses: string[];
  updatedData: Partial<UserSessionData>;
}

export function extractName(input: string): string {
  let trimmed = input.trim().replace(/[.!?,;:]+$/, '').trim();

  const prefixes = [
    /^(?:hello|hi|hey|greetings)[,\s]+/i,
    /^(?:my name is|my name's|name is)\s+/i,
    /^(?:i am|i'm|im|it's|its|this is|call me)\s+/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (prefix.test(trimmed)) {
        trimmed = trimmed.replace(prefix, '').trim();
        changed = true;
      }
    }
  }

  if (trimmed.length > 0 && trimmed === trimmed.toLowerCase()) {
    trimmed = trimmed
      .split(' ')
      .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }

  return trimmed || input.trim();
}

export function processDialogue(
  currentStep: DialogueStep,
  input: string,
  userData: UserSessionData
): DialogueResult {
  const cleaned = input.trim();
  const lowered = cleaned.toLowerCase();

  switch (currentStep) {
    case 'name': {
      const cleanName = extractName(cleaned);
      return {
        nextStep: 'age',
        botResponses: [
          `Hello ${cleanName}`,
          'How old are you?'
        ],
        updatedData: { name: cleanName }
      };
    }

    case 'age': {
      const matchDigits = cleaned.replace(/\D/g, '');
      const parsedAge = matchDigits ? parseInt(matchDigits, 10) : 19;
      const responses: string[] = [`So you're ${parsedAge}`];

      if (parsedAge <= 18) {
        responses.push("you're still too young");
      } else {
        responses.push("you're already an adult.");
      }

      responses.push('where are you from?');

      return {
        nextStep: 'country',
        botResponses: responses,
        updatedData: { age: parsedAge }
      };
    }

    case 'country': {
      return {
        nextStep: 'ever_watched',
        botResponses: [
          `ohh, i see you're from ${cleaned}`,
          'Have you ever watch anime before?'
        ],
        updatedData: { country: cleaned }
      };
    }

    case 'ever_watched': {
      if (lowered.includes('yes')) {
        return {
          nextStep: 'anime_choice',
          botResponses: [
            'So let me ask you...',
            'What anime do you watch?'
          ],
          updatedData: { watchedAnime: true }
        };
      } else {
        return {
          nextStep: 'anime_type',
          botResponses: [
            "you gonna go try watch some it's very interesting.",
            'So by the way...',
            'what kind of anime do you like?'
          ],
          updatedData: { watchedAnime: false }
        };
      }
    }

    case 'anime_choice': {
      const responses: string[] = [`so you're watching ${cleaned}`];

      if (lowered.includes('oshinoko') || lowered.includes('oshi no ko')) {
        responses.push('very good you choose a very good anime to watch.');
        responses.push('let me ask you..');
        responses.push('who is your favorite character?');
        return {
          nextStep: 'fav_char',
          botResponses: responses,
          updatedData: { selectedAnime: 'oshinoko' }
        };
      } else if (lowered.includes('assassination classroom')) {
        responses.push('Hmm, very good choice');
        responses.push('let me ask you..');
        responses.push('So who is your favorite character by the way?');
        return {
          nextStep: 'fav_char',
          botResponses: responses,
          updatedData: { selectedAnime: 'assassination classroom' }
        };
      } else if (lowered.includes('demon slayer') || lowered.includes('kimetsu')) {
        responses.push('i think you maybe tanjiro fan.');
        responses.push('let me ask you..');
        responses.push('so who is your favorite character?');
        return {
          nextStep: 'fav_char',
          botResponses: responses,
          updatedData: { selectedAnime: 'demon slayer' }
        };
      } else if (lowered.includes('naruto')) {
        responses.push("I've watched that before, they are very interesting");
        responses.push('let me ask you..');
        responses.push('who is your favorite character?');
        return {
          nextStep: 'fav_char',
          botResponses: responses,
          updatedData: { selectedAnime: 'naruto' }
        };
      } else {
        responses.push('maybe i should go and watch that too.');
        responses.push('So by the way...');
        responses.push('what kind of anime do you like?');
        return {
          nextStep: 'anime_type',
          botResponses: responses,
          updatedData: { selectedAnime: cleaned }
        };
      }
    }

    case 'fav_char': {
      const responses: string[] = [];
      const anime = (userData.selectedAnime || '').toLowerCase();

      if (anime.includes('oshinoko') || anime.includes('oshi no ko')) {
        if (lowered.includes('ai')) {
          responses.push("Yes, i like her too. she's very beautiful, she's also my favorite one.");
        } else if (lowered.includes('ruby')) {
          responses.push("she's so cute, i love the way she hugs aqua.");
        } else if (lowered.includes('aqua')) {
          responses.push("i also like him, because he revenge for Ai.");
        } else if (lowered.includes('hikaru')) {
          responses.push("fuck you go to hell, i hate him. he's the worst.");
        } else if (lowered.includes('kana')) {
          responses.push("you're Kana Arima's fan.");
        } else {
          responses.push('fine with me.');
        }
      } else if (anime.includes('assassination classroom')) {
        if (lowered.includes('nagisa')) {
          responses.push("i thought that he was a girl at first, but he's very a good person");
        } else if (lowered.includes('karma')) {
          responses.push("he's actually really kind, if you watch carefully.");
        } else if (lowered.includes('kayano')) {
          responses.push("i'm surprise that she can makes such a big pudding like that.");
        } else if (lowered.includes('ritsu')) {
          responses.push("even though she's a robot box but she's beautiful and can do anything.");
        } else {
          responses.push("i'm ok with the other.");
        }
      } else if (anime.includes('demon slayer')) {
        if (lowered.includes('tanjiro')) {
          responses.push("Even tough that he's young but he's very strong.");
        } else if (lowered.includes('muzan')) {
          responses.push("he's the demon king why you like him? he's the worst.");
        } else {
          responses.push("it's ok, i like too.");
        }
      } else if (anime.includes('naruto')) {
        if (lowered.includes('naruto')) {
          responses.push("he's so good.");
        } else {
          responses.push('Fine by me.');
        }
      } else {
        responses.push('Fine with me.');
      }

      responses.push('So by the way...');
      responses.push('what kind of anime do you like?');

      return {
        nextStep: 'anime_type',
        botResponses: responses,
        updatedData: { favoriteCharacter: cleaned }
      };
    }

    case 'anime_type': {
      const responses: string[] = [];
      if (lowered.includes('action')) {
        responses.push('ohh good, sometimes i watch that too.');
      } else if (lowered.includes('romance')) {
        responses.push("Ohh, you're the same as me.. i also love to watch Romance anime.");
      } else if (lowered.includes('comedy')) {
        responses.push('i never watch comedy anime before...');
      } else {
        responses.push("is that you're favorite type. oh i see...");
      }

      responses.push("So now let's move on to another questions.");
      responses.push('how many anime have you watched ?');

      return {
        nextStep: 'number_anime',
        botResponses: responses,
        updatedData: { animeType: cleaned }
      };
    }

    case 'number_anime': {
      const responses: string[] = [];
      if (cleaned === '1') {
        responses.push("ohh , you're just started to watch it, keep watching.");
      } else if (cleaned === '2') {
        responses.push('keep watching.');
      } else if (cleaned === '3') {
        responses.push('wow! 3');
      } else {
        responses.push('keep watching more!!!!!');
      }

      responses.push('when you start to watch anime?');

      return {
        nextStep: 'when_started',
        botResponses: responses,
        updatedData: { numberWatched: cleaned }
      };
    }

    case 'when_started': {
      const responses: string[] = [];
      if (lowered.includes('young') || lowered.includes('8')) {
        responses.push("damn that's young");
      } else if (lowered.includes('teen') || lowered.includes('13')) {
        responses.push('you started to watch at 13!? similar to me.');
      } else {
        responses.push('i bet you already watched lots of anime.');
      }

      responses.push('actually anime is not just an animation that they just create..');
      responses.push('anime makes my life full of happy and joy');
      responses.push('anime is better than the reality.');
      responses.push('Now rate your favorite anime, the best one for you from 1-10.');

      return {
        nextStep: 'rating',
        botResponses: responses,
        updatedData: { whenStarted: cleaned }
      };
    }

    case 'rating': {
      const responses: string[] = [];
      const score = cleaned.replace(/\D/g, '') || '10';

      if (score === '1') {
        responses.push('i said favorite the best why you rate so low??');
      } else if (score === '2') {
        responses.push("don't you like it, you suppose to like it because i say the BEST one for you!!!");
      } else if (score === '3') {
        responses.push("that's so low!");
      } else if (score === '4') {
        responses.push("comon' if you rate it this low why it is your favorite one?");
      } else if (score === '5') {
        responses.push('Hmm average i see..');
      } else if (score === '6') {
        responses.push('pretty good!');
      } else if (score === '7') {
        responses.push("that's good maybe ..");
      } else if (score === '8') {
        responses.push('i bet that must be good.');
      } else if (score === '9') {
        responses.push('wow! excellent !!');
      } else if (score === '10') {
        responses.push('perfect!!!');
      } else {
        responses.push(`Rated ${cleaned}! Thanks for rating!`);
      }

      responses.push('Do you want to answer more questions? (yes/no)');

      return {
        nextStep: 'more_questions',
        botResponses: responses,
        updatedData: { rating: parseInt(score, 10) || 10 }
      };
    }

    case 'more_questions': {
      if (lowered.includes('yes')) {
        return {
          nextStep: 'open_chat',
          botResponses: ['Awesome! What else would you like to talk about regarding anime?'],
          updatedData: {}
        };
      } else {
        return {
          nextStep: 'done',
          botResponses: ['bye! see you later!'],
          updatedData: {}
        };
      }
    }

    default: {
      if (lowered.includes('restart') || lowered.includes('again') || lowered.includes('reset')) {
        return {
          nextStep: 'name',
          botResponses: [
            '-----------welcome to our little chatbot---------------',
            '-----------entering the chatbot------------------------',
            'What is your name?'
          ],
          updatedData: {
            name: '',
            age: null,
            country: '',
            watchedAnime: null,
            selectedAnime: '',
            favoriteCharacter: '',
            animeType: '',
            numberWatched: '',
            whenStarted: '',
            rating: 10
          }
        };
      }

      return {
        nextStep: currentStep,
        botResponses: [
          "Anime forever! 🌸 Type 'restart' or click 'Clear Chat History' in the sidebar to start a new chat round!"
        ],
        updatedData: {}
      };
    }
  }
}
