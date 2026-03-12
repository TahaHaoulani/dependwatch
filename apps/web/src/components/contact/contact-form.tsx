'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const TOPICS = [
  { value: '', label: 'Select topic' },
  { value: 'support', label: 'Product & support' },
  { value: 'security', label: 'Security & privacy' },
  { value: 'partnership', label: 'Partnerships & sales' },
  { value: 'other', label: 'Other' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;

export function ContactForm() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const emailValid = EMAIL_REGEX.test(email.trim());
  const messageValid = message.trim().length >= MIN_MESSAGE_LENGTH && message.length <= MAX_MESSAGE_LENGTH;
  const subjectValid = subject.trim().length >= 2 && subject.length <= 200;
  const canSubmit = emailValid && subjectValid && messageValid && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim(),
          topic: topic && topic !== '__none' ? topic : undefined,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: 'Message not sent',
          description: data.error || 'Something went wrong. Please try again or email us directly.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Message sent',
        description: "We'll get back to you within 1–2 business days.",
      });
      setEmail('');
      setSubject('');
      setTopic('');
      setMessage('');
    } catch {
      toast({
        title: 'Message not sent',
        description: 'Network error. Please try again or email us directly.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-email">Your email *</Label>
          <Input
            id="contact-email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className={cn(!email && !email.length ? '' : emailValid ? '' : 'border-warning/50 focus-visible:ring-warning/30')}
          />
          {email.length > 0 && !emailValid && (
            <p className="text-xs text-warning">Enter a valid email address.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-topic">Topic</Label>
          <Select value={topic || '__none'} onValueChange={(v) => setTopic(v === '__none' ? '' : v)} disabled={loading}>
            <SelectTrigger id="contact-topic" className="w-full">
              <SelectValue placeholder="Select topic" />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((t) => (
                <SelectItem key={t.value || 'none'} value={t.value || '__none'}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">Subject *</Label>
        <Input
          id="contact-subject"
          type="text"
          placeholder="Brief subject line"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={2}
          maxLength={200}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message *</Label>
        <textarea
          id="contact-message"
          placeholder="Your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={MIN_MESSAGE_LENGTH}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={5}
          disabled={loading}
          className="flex w-full rounded-input border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">
          {message.length} / {MAX_MESSAGE_LENGTH} characters (min {MIN_MESSAGE_LENGTH})
        </p>
        {message.length > 0 && message.length < MIN_MESSAGE_LENGTH && (
          <p className="text-xs text-warning">Please enter at least {MIN_MESSAGE_LENGTH} characters.</p>
        )}
      </div>
      <Button type="submit" disabled={!canSubmit} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          'Send message'
        )}
      </Button>
    </form>
  );
}
