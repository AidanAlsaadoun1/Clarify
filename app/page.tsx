'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Volume2, FileText, List, Lightbulb, Moon, Sun, Languages, BookOpen, RotateCcw, Pause, Play, ChevronDown, Upload, Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type SimplifiedContent = {
  summary: string;
  bulletPoints: string[];
  eli5: string;
};

type KeyTerm = {
  term: string;
  definition: string;
};

type Language = {
  code: string;
  name: string;
};

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
];

const MAX_AUDIO_CHARACTERS = 10000;
const MIN_TEXT_CHARACTERS = 500;

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [simplifiedContent, setSimplifiedContent] = useState<SimplifiedContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [useFallbackTTS, setUseFallbackTTS] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedContent, setTranslatedContent] = useState<SimplifiedContent | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [keyTerms, setKeyTerms] = useState<KeyTerm[] | null>(null);
  const [isExplainingTerms, setIsExplainingTerms] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(true);
  const [keyPointsOpen, setKeyPointsOpen] = useState(true);
  const [eli5Open, setEli5Open] = useState(true);
  const [keyTermsOpen, setKeyTermsOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // Be explicit instead of using toggle
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExportPDF = async () => {
    if (!simplifiedContent) return;

    setIsExportingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const contentToExport = translatedContent || simplifiedContent;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Helper function to add text with line wrapping
      const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        const lines = doc.splitTextToSize(text, maxWidth);
        
        for (const line of lines) {
          // Check if we need a new page
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += fontSize * 0.5;
        }
      };

      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Simplified Content', margin, yPosition);
      yPosition += 15;

      // Table of Contents
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Table of Contents', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('1. Summary', margin + 5, yPosition);
      yPosition += 7;
      doc.text('2. Key Points', margin + 5, yPosition);
      yPosition += 7;
      doc.text('3. Simple Explanation', margin + 5, yPosition);
      yPosition += 7;
      
      if (keyTerms && keyTerms.length > 0) {
        doc.text('4. Explain Key Terms', margin + 5, yPosition);
        yPosition += 7;
      }
      
      yPosition += 10;
      
      // Add a line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Summary Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Summary', margin, yPosition);
      yPosition += 10;
      addWrappedText(contentToExport.summary, 12);
      yPosition += 10;

      // Key Points Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Key Points', margin, yPosition);
      yPosition += 10;
      
      contentToExport.bulletPoints.forEach((point, index) => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const bulletPoint = `• ${point}`;
        const lines = doc.splitTextToSize(bulletPoint, maxWidth);
        
        for (const line of lines) {
          if (yPosition > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 6;
        }
        yPosition += 3;
      });
      yPosition += 5;

      // ELI5 Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Simple Explanation', margin, yPosition);
      yPosition += 10;
      addWrappedText(contentToExport.eli5, 12);
      yPosition += 10;

      // Key Terms Section (if available)
      if (keyTerms && keyTerms.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('4. Explain Key Terms', margin, yPosition);
        yPosition += 10;

        keyTerms.forEach((term) => {
          if (yPosition > pageHeight - margin - 20) {
            doc.addPage();
            yPosition = margin;
          }
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(term.term, margin, yPosition);
          yPosition += 7;
          
          addWrappedText(term.definition, 11);
          yPosition += 8;
        });
      }

      // Generate PDF as blob
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create temporary download link
      const downloadLink = document.createElement('a');
      const languageName = LANGUAGES.find(l => l.code === selectedLanguage)?.name || 'English';
      downloadLink.href = blobUrl;
      downloadLink.download = `simplified-content-${languageName.toLowerCase()}.pdf`;
      
      // Trigger download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Cleanup: Remove link and revoke blob URL after download
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSimplify = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setTranslatedContent(null);
    setSelectedLanguage('en');
    
    try {
      const response = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      setSimplifiedContent(data.simplified);
    } catch (error) {
      console.error('Error simplifying text:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (languageCode: string) => {
    if (!simplifiedContent || languageCode === 'en') {
      setTranslatedContent(null);
      return;
    }

    handleStopAudio();
    setAudioElement(null);
    
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: simplifiedContent,
          targetLanguage: languageCode,
        }),
      });

      const data = await response.json();
      setTranslatedContent(data.translated);
    } catch (error) {
      console.error('Error translating content:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleExplainKeyTerms = async () => {
    if (!simplifiedContent) return;

    setIsExplainingTerms(true);
    try {
      const contentToExplain = translatedContent || simplifiedContent;
      const response = await fetch('/api/explain-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToExplain,
          originalText: inputText,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();
      setKeyTerms(data.terms);
    } catch (error) {
      console.error('Error explaining key terms:', error);
    } finally {
      setIsExplainingTerms(false);
    }
  };

  const playWithWebSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayAudio = async () => {
    if (audioElement && !isPlaying) {
      setIsPlaying(true);
      await audioElement.play();
      return;
    }

    if (!simplifiedContent) return;

    const contentToRead = translatedContent || simplifiedContent;
    const textToRead = `Summary: ${contentToRead.summary}. 
      
      Key points: ${contentToRead.bulletPoints.join('. ')}. 
      
      Simple explanation: ${contentToRead.eli5}`;

    if (textToRead.length > MAX_AUDIO_CHARACTERS) {
      alert(`Audio playback is limited to ${MAX_AUDIO_CHARACTERS} characters to adhere to Groq policy. The simplified content is ${textToRead.length} characters. Please try simplifying shorter text for audio playback.`);
      return;
    }

    if (useFallbackTTS) {
      playWithWebSpeech(textToRead);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: textToRead,
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error && errorData.error.includes('terms acceptance')) {
          const shouldUseFallback = confirm(
            'PlayAI TTS requires terms acceptance at Groq Console (https://console.groq.com/playground?model=playai-tts).\n\n' +
            'Would you like to use the browser\'s built-in text-to-speech instead? (Click OK for browser TTS, Cancel to stop)'
          );
          
          if (shouldUseFallback) {
            setUseFallbackTTS(true);
            setIsLoadingAudio(false);
            playWithWebSpeech(textToRead);
            return;
          } else {
            throw new Error('TTS unavailable');
          }
        }
        
        throw new Error('Failed to generate audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime);
        setAudioDuration(audio.duration);
      };
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setAudioProgress(0);
        URL.revokeObjectURL(audioUrl);
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handlePauseAudio = () => {
    if (audioElement) {
      audioElement.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPlaying(false);
  };

  const handleRestartAudio = () => {
    if (audioElement) {
      audioElement.currentTime = 0;
      setAudioProgress(0);
      audioElement.play();
      setIsPlaying(true);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const contentToRead = translatedContent || simplifiedContent;
      if (contentToRead) {
        const textToRead = `Summary: ${contentToRead.summary}. Key points: ${contentToRead.bulletPoints.join('. ')}. Simple explanation: ${contentToRead.eli5}`;
        playWithWebSpeech(textToRead);
      }
    }
  };

  const handleStopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioProgress(0);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or DOCX file');
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse file');
      }

      const data = await response.json();
      setInputText(data.text);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to parse file. Please try again.');
    } finally {
      setIsUploadingFile(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearAll = () => {
    setInputText('');
    setSimplifiedContent(null);
    setTranslatedContent(null);
    setKeyTerms(null);
    setSelectedLanguage('en');
    handleStopAudio();
    setAudioElement(null);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayContent = translatedContent || simplifiedContent;

  const shouldShowPlayAudioButton = selectedLanguage === 'en' || selectedLanguage === 'ar';

  const characterCount = inputText.trim().length;
  const meetsMinimum = characterCount >= MIN_TEXT_CHARACTERS;

  if (showHelp) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <Button
              onClick={() => setShowHelp(false)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              ← Back to App
            </Button>
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm transition-all hover:shadow-md"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="size-4" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="size-4" />
                  Light Mode
                </>
              )}
            </Button>
          </div>

          <div className="text-center mb-12">
            <h1 className="mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text font-bold text-5xl text-transparent tracking-tight">
              How to Use Clarify
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-muted-foreground text-xl">
              A complete guide to all features and capabilities
            </p>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <h2 className="font-semibold text-2xl text-foreground">Getting Started</h2>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="mb-2 font-semibold text-foreground text-lg">1. Add Your Text</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    You have two options to add text:
                  </p>
                  <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
                    <li>Paste text directly into the text area (minimum 500 characters)</li>
                    <li>Upload a PDF or DOCX file using the &quot;Upload PDF or DOCX&quot; button</li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-foreground text-lg">2. Simplify</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Click the &quot;Simplify Text&quot; button to transform your content into an easy-to-understand format with:
                  </p>
                  <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
                    <li><strong>Summary:</strong> A concise overview of the main ideas</li>
                    <li><strong>Key Points:</strong> Important takeaways in bullet format</li>
                    <li><strong>Explain Like I&apos;m 5:</strong> Super simple explanation anyone can understand</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <h2 className="font-semibold text-2xl text-foreground">Core Features</h2>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground text-lg">
                    <Languages className="size-5 text-primary" />
                    Translation (12 Languages)
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    After simplifying, use the language dropdown to translate your content into Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, or Russian. The simplified content maintains its clarity in every language.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground text-lg">
                    <Volume2 className="size-5 text-primary" />
                    Audio Playback
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    For English and Arabic, click &quot;Play Audio&quot; to hear the simplified content read aloud using high-quality AI voices. Perfect for students with dyslexia or those who prefer audio learning. Controls include:
                  </p>
                  <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
                    <li>Play/Pause to control playback</li>
                    <li>Restart to begin from the start</li>
                    <li>Progress bar showing current position and total duration</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground text-sm">
                    <em>Note: Audio supports up to 10,000 characters</em>
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground text-lg">
                    <BookOpen className="size-5 text-primary" />
                    Explain Key Terms
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Click &quot;Explain Key Terms&quot; to automatically identify complex vocabulary and provide simple definitions. This helps you understand difficult words without leaving the app, available in all 12 supported languages.
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-foreground text-lg">
                    <Download className="size-5 text-primary" />
                    Export to PDF
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Save your simplified content as a PDF with a table of contents. The export includes all sections (Summary, Key Points, ELI5, and Key Terms if generated) in a clean, readable format perfect for studying or reference.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <h2 className="font-semibold text-2xl text-foreground">Tips for Best Results</h2>
              </div>
              <div className="space-y-3 p-6">
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-medium text-foreground">📝 Text Length</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Minimum 500 characters required. Longer texts (up to several pages) work great and provide more comprehensive summaries.
                  </p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-medium text-foreground">🎯 Best Content Types</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Academic articles, textbook chapters, research papers, news articles, and complex explanations work best.
                  </p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-medium text-foreground">🔄 Collapsible Sections</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Click section headers to collapse/expand them. This reduces visual clutter and helps you focus on one section at a time.
                  </p>
                </div>
                <div className="rounded-lg bg-primary/5 p-4">
                  <p className="font-medium text-foreground">🌙 Dark Mode</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    Toggle between light and dark themes for comfortable reading in any lighting condition. Your preference is saved automatically.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <h2 className="font-semibold text-2xl text-foreground">Accessibility Features</h2>
              </div>
              <div className="p-6">
                <p className="mb-4 text-muted-foreground leading-relaxed">
                  Clarify is designed specifically for students with learning differences like ADHD and dyslexia:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span><strong>Clean, focused design</strong> reduces cognitive load and visual distractions</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span><strong>Text-to-speech</strong> helps with reading challenges and comprehension</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span><strong>Clear structure</strong> with summaries and key points makes information digestible</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span><strong>Generous spacing</strong> and readable fonts improve focus</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                    <span><strong>Vocabulary support</strong> explains complex terms in simple language</span>
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="mb-6 flex justify-end gap-2">
            <Button
              onClick={() => setShowHelp(true)}
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm transition-all hover:shadow-md"
            >
              <BookOpen className="size-4" />
              Help
            </Button>
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="sm"
              className="gap-2 shadow-sm transition-all hover:shadow-md"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="size-4" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="size-4" />
                  Light Mode
                </>
              )}
            </Button>
          </div>
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <div className="size-2 animate-pulse rounded-full bg-primary" />
              <span className="font-medium text-primary text-sm">Powered by AI</span>
            </div>
            <h1 className="mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text font-bold text-5xl text-transparent tracking-tight sm:text-6xl">
              Clarify
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-muted-foreground text-xl leading-relaxed">
              Transform complex texts into clear, simple summaries. Designed for students who need focus and clarity.
            </p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Input Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <label htmlFor="input-text" className="font-semibold text-xl">
                Your Text
              </label>
              {inputText && (
                <Button
                  onClick={handleClearAll}
                  variant="destructive"
                  size="sm"
                  className="gap-2 shadow-sm transition-all hover:shadow-md"
                >
                  <RotateCcw className="size-4" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploadingFile}
                variant="outline"
                size="default"
                className="w-full gap-2 shadow-sm transition-all hover:shadow-md"
              >
                {isUploadingFile ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing File...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload PDF or DOCX
                  </>
                )}
              </Button>
            </div>
            
            <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
              <Textarea
                id="input-text"
                placeholder="Paste any text here... articles, textbooks, research papers, etc."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[450px] resize-none border-0 font-mono text-base leading-relaxed focus-visible:ring-0"
                autoComplete="off"
                data-form-type="other"
              />
            </Card>
            
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className={`font-medium text-sm ${meetsMinimum ? 'text-muted-foreground' : 'text-destructive'}`}>
                {characterCount} / {MIN_TEXT_CHARACTERS} characters minimum
              </span>
              {!meetsMinimum && characterCount > 0 && (
                <span className="text-destructive text-xs">
                  +{MIN_TEXT_CHARACTERS - characterCount} more needed
                </span>
              )}
            </div>
            
            <Button
              onClick={handleSimplify}
              disabled={!meetsMinimum || isProcessing}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-base shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:scale-100"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Simplifying...
                </>
              ) : (
                <>
                  <FileText className="size-5" />
                  Simplify Text
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="font-semibold text-xl">Simplified Content</label>
              <div className="flex flex-wrap items-center gap-2">
                {simplifiedContent && (
                  <>
                    <Button
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      variant="outline"
                      size="sm"
                      className="gap-2 shadow-sm transition-all hover:shadow-md"
                    >
                      {isExportingPDF ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="size-4" />
                          Export PDF
                        </>
                      )}
                    </Button>
                    <Select
                      value={selectedLanguage}
                      onValueChange={(value) => {
                        setSelectedLanguage(value);
                        handleTranslate(value);
                        handleStopAudio();
                        setAudioElement(null);
                      }}
                      disabled={isTranslating}
                    >
                      <SelectTrigger className="w-[150px] gap-2 shadow-sm">
                        <Languages className="size-4" />
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {shouldShowPlayAudioButton && simplifiedContent && (
              <Card className="overflow-hidden shadow-lg">
                <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                  {!audioElement && !isPlaying ? (
                    <Button
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio || isTranslating}
                      variant="default"
                      size="sm"
                      className="gap-2 bg-primary/90 hover:bg-primary"
                    >
                      {isLoadingAudio ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Play className="size-4" />
                          Play Audio
                        </>
                      )}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={isPlaying ? handlePauseAudio : handlePlayAudio}
                        disabled={isLoadingAudio}
                        variant="default"
                        size="sm"
                        className="gap-2 bg-primary/90 hover:bg-primary"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="size-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="size-4" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleRestartAudio}
                        disabled={isLoadingAudio}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <RotateCcw className="size-4" />
                        Restart
                      </Button>
                    </>
                  )}
                </div>
                
                {audioElement && audioDuration > 0 && (
                  <div className="flex items-center gap-3 px-4 pb-4">
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatTime(audioProgress)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-200"
                        style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatTime(audioDuration)}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {isTranslating && (
              <Card className="flex min-h-[450px] items-center justify-center p-8 shadow-lg">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 size-12 animate-spin text-primary" />
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Translating content...
                  </p>
                </div>
              </Card>
            )}

            {!isTranslating && displayContent && (
              <div className="flex flex-col gap-4">
                <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
                  <Card className="overflow-hidden shadow-lg transition-all hover:shadow-xl">
                    <CollapsibleTrigger className="flex w-full items-center justify-between bg-gradient-to-r from-primary/5 to-transparent p-6 transition-colors hover:from-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <FileText className="size-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-lg">Summary</h3>
                      </div>
                      <ChevronDown className={`size-5 text-muted-foreground transition-transform duration-300 ${summaryOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-6">
                      <div className="pt-4">
                        <p className="text-base text-foreground leading-relaxed">
                          {displayContent.summary}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible open={keyPointsOpen} onOpenChange={setKeyPointsOpen}>
                  <Card className="overflow-hidden shadow-lg transition-all hover:shadow-xl">
                    <CollapsibleTrigger className="flex w-full items-center justify-between bg-gradient-to-r from-primary/5 to-transparent p-6 transition-colors hover:from-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <List className="size-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-lg">Key Points</h3>
                      </div>
                      <ChevronDown className={`size-5 text-muted-foreground transition-transform duration-300 ${keyPointsOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-6">
                      <div className="pt-4">
                        <ul className="space-y-3">
                          {displayContent.bulletPoints.map((point, index) => (
                            <li key={index} className="flex gap-3 text-base leading-relaxed">
                              <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
                              <span className="text-foreground">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Collapsible open={eli5Open} onOpenChange={setEli5Open}>
                  <Card className="overflow-hidden shadow-lg transition-all hover:shadow-xl">
                    <CollapsibleTrigger className="flex w-full items-center justify-between bg-gradient-to-r from-primary/5 to-transparent p-6 transition-colors hover:from-primary/10">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Lightbulb className="size-5 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-lg">Explain Like I&apos;m 5</h3>
                      </div>
                      <ChevronDown className={`size-5 text-muted-foreground transition-transform duration-300 ${eli5Open ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-6 pb-6">
                      <div className="pt-4">
                        <p className="text-base text-foreground leading-relaxed">
                          {displayContent.eli5}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <Button
                  onClick={handleExplainKeyTerms}
                  disabled={isExplainingTerms}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 shadow-sm transition-all hover:shadow-md"
                >
                  {isExplainingTerms ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Finding Key Terms...
                    </>
                  ) : (
                    <>
                      <BookOpen className="size-5" />
                      Explain Key Terms
                    </>
                  )}
                </Button>

                {keyTerms && keyTerms.length > 0 && (
                  <Collapsible open={keyTermsOpen} onOpenChange={setKeyTermsOpen}>
                    <Card className="overflow-hidden shadow-lg transition-all hover:shadow-xl">
                      <CollapsibleTrigger className="flex w-full items-center justify-between bg-gradient-to-r from-primary/5 to-transparent p-6 transition-colors hover:from-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <BookOpen className="size-5 text-primary" />
                          </div>
                          <h3 className="font-semibold text-foreground text-lg">Key Terms Vocabulary</h3>
                        </div>
                        <ChevronDown className={`size-5 text-muted-foreground transition-transform duration-300 ${keyTermsOpen ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-6 pb-6">
                        <div className="pt-4">
                          <div className="space-y-4">
                            {keyTerms.map((item, index) => (
                              <div key={index} className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                                <h4 className="mb-2 font-semibold text-base text-foreground">
                                  {item.term}
                                </h4>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                  {item.definition}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>
            )}

            {!isTranslating && !displayContent && (
              <Card className="flex min-h-[450px] items-center justify-center p-8 shadow-lg">
                <div className="text-center">
                  <div className="mx-auto mb-4 rounded-full bg-primary/10 p-6">
                    <FileText className="size-12 text-primary" />
                  </div>
                  <p className="text-center text-muted-foreground text-lg leading-relaxed">
                    Your simplified content will appear here after clicking &quot;Simplify Text&quot;
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
