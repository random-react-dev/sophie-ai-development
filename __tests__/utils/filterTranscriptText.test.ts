import { filterTranscriptText } from '@/utils/filterTranscriptText';

describe('filterTranscriptText', () => {
  describe('XML thinking blocks', () => {
    it('removes <thinking>...</thinking> blocks', () => {
      const input = '<thinking>I should greet the user</thinking>Hello!';
      expect(filterTranscriptText(input)).toBe('Hello!');
    });

    it('removes multiline thinking blocks', () => {
      const input = '<thinking>\nI need to plan my response\nLet me think about this\n</thinking>\n\nHola, como estas?';
      expect(filterTranscriptText(input)).toBe('Hola, como estas?');
    });

    it('is case-insensitive for thinking tags', () => {
      const input = '<THINKING>some thoughts</THINKING>Bonjour!';
      expect(filterTranscriptText(input)).toBe('Bonjour!');
    });

    it('removes multiple thinking blocks', () => {
      const input = '<thinking>first</thinking>Hello <thinking>second</thinking>there';
      expect(filterTranscriptText(input)).toBe('Hello there');
    });
  });

  describe('asterisk-wrapped text (unwrap, keep content)', () => {
    it('unwraps *thinks* patterns, keeping the text', () => {
      const input = '*thinks* Hello! *pauses* How are you?';
      expect(filterTranscriptText(input)).toBe('thinks Hello! pauses How are you?');
    });

    it('unwraps *laughs* and other actions, keeping the text', () => {
      const input = '*laughs* That was funny! *smiles*';
      expect(filterTranscriptText(input)).toBe('laughs That was funny! smiles');
    });

    it('unwraps **bold** markdown', () => {
      const input = '**Namaste**! How are you?';
      expect(filterTranscriptText(input)).toBe('Namaste! How are you?');
    });

    it('unwraps non-Latin scripts in bold markdown', () => {
      const input = '**नमस्ते**! Welcome!';
      expect(filterTranscriptText(input)).toBe('नमस्ते! Welcome!');
    });

    it('does not match asterisks across newlines', () => {
      const input = '*action\ntext* Hello!';
      expect(filterTranscriptText(input)).toContain('Hello!');
    });
  });

  describe('bracket/paren markers', () => {
    it('removes [thinking] markers', () => {
      const input = '[thinking about response] Hello!';
      expect(filterTranscriptText(input)).toBe('Hello!');
    });

    it('removes [internal monologue] markers', () => {
      const input = '[internal monologue: planning] Hi there!';
      expect(filterTranscriptText(input)).toBe('Hi there!');
    });

    it('removes (thinking) markers', () => {
      const input = '(thinking about vocabulary) Hola!';
      expect(filterTranscriptText(input)).toBe('Hola!');
    });

    it('removes (internal) markers', () => {
      const input = '(internal note: user is beginner) Welcome!';
      expect(filterTranscriptText(input)).toBe('Welcome!');
    });
  });

  describe('bold markdown headers', () => {
    it('unwraps **bold headers** and filters by paragraph content', () => {
      // Bold wrapping is stripped first, then paragraph filter runs
      // "Response Plan" doesn't match monologue patterns so it survives
      const input = '**Response Plan**\n\nHello there!';
      expect(filterTranscriptText(input)).toContain('Hello there!');
    });

    it('removes bold headers that are separate paragraphs', () => {
      const input = 'My plan is to greet the user.\n\nActual response here';
      expect(filterTranscriptText(input)).toBe('Actual response here');
    });
  });

  describe('internal monologue paragraph filtering', () => {
    it('filters paragraphs starting with "I\'ve"', () => {
      const input = "I've decided to help the user.\n\nHola! Como te llamas?";
      expect(filterTranscriptText(input)).toBe('Hola! Como te llamas?');
    });

    it('filters paragraphs starting with "I\'m"', () => {
      const input = "I'm going to respond in Spanish.\n\nBuenas tardes!";
      expect(filterTranscriptText(input)).toBe('Buenas tardes!');
    });

    it('filters paragraphs starting with "I am"', () => {
      const input = "I am set to proceed with the lesson.\n\nHello!";
      expect(filterTranscriptText(input)).toBe('Hello!');
    });

    it('filters "Okay, I..." patterns', () => {
      const input = "Okay, I'll start with a greeting.\n\nNamaste!";
      expect(filterTranscriptText(input)).toBe('Namaste!');
    });

    it('filters "My plan is..." patterns', () => {
      const input = "My plan is to teach greetings.\n\nKonnichiwa!";
      expect(filterTranscriptText(input)).toBe('Konnichiwa!');
    });

    it('filters "I will start..." patterns', () => {
      const input = "I will start by introducing myself.\n\nHej! Jag heter Sophie.";
      expect(filterTranscriptText(input)).toBe('Hej! Jag heter Sophie.');
    });

    it('keeps normal conversational text', () => {
      const input = "How are you doing today?";
      expect(filterTranscriptText(input)).toBe('How are you doing today?');
    });
  });

  describe('edge cases', () => {
    it('returns empty string when everything is filtered', () => {
      const input = "<thinking>all thinking</thinking>";
      expect(filterTranscriptText(input)).toBe('');
    });

    it('handles empty input', () => {
      expect(filterTranscriptText('')).toBe('');
    });

    it('preserves clean text without changes', () => {
      const input = 'Hola! Como estas hoy?';
      expect(filterTranscriptText(input)).toBe('Hola! Como estas hoy?');
    });

    it('handles combined patterns', () => {
      const input = '<thinking>plan</thinking>\n\nI will begin the lesson.\n\nActual spoken text here.';
      expect(filterTranscriptText(input)).toBe('Actual spoken text here.');
    });
  });
});
