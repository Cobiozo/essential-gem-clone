import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingModule, TrainingLesson } from '@/types/training';

interface ModuleTranslation {
  id: string;
  module_id: string;
  language_code: string;
  title: string | null;
  description: string | null;
}

interface LessonTranslation {
  id: string;
  lesson_id: string;
  language_code: string;
  title: string | null;
  content: string | null;
  media_alt_text: string | null;
}

export const useTrainingTranslations = (
  modules: TrainingModule[],
  lessons: TrainingLesson[],
  languageCode: string,
  defaultLanguage: string = 'pl'
): { translatedModules: TrainingModule[]; translatedLessons: TrainingLesson[] } => {
  const [moduleTranslations, setModuleTranslations] = useState<ModuleTranslation[]>([]);
  const [lessonTranslations, setLessonTranslations] = useState<LessonTranslation[]>([]);

  const moduleIds = useMemo(() => modules.map(m => m.id).sort().join(','), [modules]);
  const lessonIds = useMemo(() => lessons.map(l => l.id).sort().join(','), [lessons]);

  useEffect(() => {
    if (languageCode === defaultLanguage || (modules.length === 0 && lessons.length === 0)) {
      setModuleTranslations([]);
      setLessonTranslations([]);
      return;
    }

    const fetchData = async () => {
      if (modules.length > 0) {
        const { data, error } = await supabase
          .from('training_module_translations')
          .select('*')
          .eq('language_code', languageCode)
          .in('module_id', modules.map(m => m.id));
        if (!error) setModuleTranslations((data as ModuleTranslation[]) || []);
      }

      if (lessons.length > 0) {
        const { data, error } = await supabase
          .from('training_lesson_translations')
          .select('*')
          .eq('language_code', languageCode)
          .in('lesson_id', lessons.map(l => l.id));
        if (!error) setLessonTranslations((data as LessonTranslation[]) || []);
      }
    };

    fetchData();
  }, [languageCode, defaultLanguage, moduleIds, lessonIds]);

  const translatedModules = useMemo(() => {
    if (languageCode === defaultLanguage) return modules;
    const map = new Map(moduleTranslations.map(t => [t.module_id, t]));
    return modules.map(m => {
      const t = map.get(m.id);
      if (!t) return m;
      return { ...m, title: t.title || m.title, description: t.description || m.description };
    });
  }, [modules, moduleTranslations, languageCode, defaultLanguage]);

  const translatedLessons = useMemo(() => {
    if (languageCode === defaultLanguage) return lessons;
    const map = new Map(lessonTranslations.map(t => [t.lesson_id, t]));
    return lessons.map(l => {
      const t = map.get(l.id);
      if (!t) return l;
      return {
        ...l,
        title: t.title || l.title,
        content: t.content || l.content,
        media_alt_text: t.media_alt_text || l.media_alt_text,
      };
    });
  }, [lessons, lessonTranslations, languageCode, defaultLanguage]);

  return { translatedModules, translatedLessons };
};
