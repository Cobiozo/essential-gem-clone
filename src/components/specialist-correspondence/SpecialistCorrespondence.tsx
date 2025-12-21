import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, User, Calendar, Search, Filter, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Correspondence {
  id: string;
  sender_id: string;
  specialist_id: string;
  subject: string;
  message: string;
  attachments: Array<{ name: string; url: string }>;
  status: string;
  email_sent: boolean;
  created_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  specialist?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    specialization: string | null;
  };
}

interface GroupedCorrespondence {
  specialist_id: string;
  sender_id: string;
  specialist: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    specialization: string | null;
  };
  messages: Correspondence[];
  lastMessage: Correspondence;
}

export const SpecialistCorrespondence = () => {
  const { user, isAdmin } = useAuth();
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialist, setFilterSpecialist] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [specialists, setSpecialists] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetchCorrespondence();
  }, [user, isAdmin]);

  const fetchCorrespondence = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use raw query since table might not be in types yet
      const { data, error } = await supabase
        .from('specialist_correspondence' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setCorrespondence([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for senders and specialists
      const senderIds = [...new Set(data.map((c: any) => c.sender_id) || [])];
      const specialistIds = [...new Set(data.map((c: any) => c.specialist_id) || [])];
      const allUserIds = [...new Set([...senderIds, ...specialistIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, specialization')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedData: Correspondence[] = data.map((c: any) => ({
        id: c.id,
        sender_id: c.sender_id,
        specialist_id: c.specialist_id,
        subject: c.subject,
        message: c.message,
        attachments: Array.isArray(c.attachments) ? c.attachments : [],
        status: c.status,
        email_sent: c.email_sent,
        created_at: c.created_at,
        sender: profileMap.get(c.sender_id),
        specialist: profileMap.get(c.specialist_id),
      }));

      setCorrespondence(enrichedData);

      // Build filter options
      const uniqueSpecialists = Array.from(new Set(enrichedData.map(c => c.specialist_id)))
        .map(id => {
          const spec = profileMap.get(id);
          return {
            id,
            name: spec ? `${spec.first_name || ''} ${spec.last_name || ''}`.trim() || spec.email : id,
          };
        });
      setSpecialists(uniqueSpecialists);

      if (isAdmin) {
        const uniqueUsers = Array.from(new Set(enrichedData.map(c => c.sender_id)))
          .map(id => {
            const u = profileMap.get(id);
            return {
              id,
              name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email : id,
            };
          });
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error fetching correspondence:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupCorrespondence = (): GroupedCorrespondence[] => {
    let filtered = correspondence;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.subject.toLowerCase().includes(term) ||
        c.message.toLowerCase().includes(term) ||
        c.specialist?.first_name?.toLowerCase().includes(term) ||
        c.specialist?.last_name?.toLowerCase().includes(term)
      );
    }

    // Apply specialist filter
    if (filterSpecialist !== 'all') {
      filtered = filtered.filter(c => c.specialist_id === filterSpecialist);
    }

    // Apply user filter (admin only)
    if (isAdmin && filterUser !== 'all') {
      filtered = filtered.filter(c => c.sender_id === filterUser);
    }

    // Group by specialist and sender combination
    const groups = new Map<string, GroupedCorrespondence>();
    
    filtered.forEach(c => {
      const key = `${c.sender_id}-${c.specialist_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          specialist_id: c.specialist_id,
          sender_id: c.sender_id,
          specialist: c.specialist || { first_name: null, last_name: null, email: '', specialization: null },
          messages: [],
          lastMessage: c,
        });
      }
      groups.get(key)!.messages.push(c);
    });

    return Array.from(groups.values()).sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );
  };

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: pl });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const grouped = groupCorrespondence();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj w korespondencji..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterSpecialist} onValueChange={setFilterSpecialist}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Specjalista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy specjaliści</SelectItem>
            {specialists.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full md:w-[200px]">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Użytkownik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak korespondencji</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const threadId = `${group.sender_id}-${group.specialist_id}`;
            const isExpanded = expandedThreads.has(threadId);
            const specialistName = group.specialist 
              ? `${group.specialist.first_name || ''} ${group.specialist.last_name || ''}`.trim() || group.specialist.email
              : 'Nieznany';

            return (
              <Card key={threadId}>
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleThread(threadId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{specialistName}</CardTitle>
                        {group.specialist?.specialization && (
                          <p className="text-sm text-muted-foreground">{group.specialist.specialization}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{group.messages.length} wiadomości</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(group.lastMessage.created_at)}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                    <strong>{group.lastMessage.subject}</strong>: {group.lastMessage.message.substring(0, 100)}...
                  </p>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t">
                    <div className="space-y-4 pt-4">
                      {group.messages.map((msg) => (
                        <div key={msg.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{msg.subject}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {msg.email_sent ? (
                                <Badge variant="default" className="bg-green-500">Wysłano</Badge>
                              ) : (
                                <Badge variant="destructive">Błąd wysyłki</Badge>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          {isAdmin && msg.sender && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Od: {msg.sender.first_name} {msg.sender.last_name} ({msg.sender.email})
                            </p>
                          )}
                          
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium flex items-center gap-1 mb-2">
                                <Paperclip className="h-4 w-4" /> Załączniki:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <a 
                                    key={i}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                  >
                                    {att.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
