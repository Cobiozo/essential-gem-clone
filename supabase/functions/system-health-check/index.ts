import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  suggestedAction: string;
  affectedUserId?: string;
  affectedEntityType?: string;
  affectedEntityId?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting system health check...');
    
    const results: HealthCheckResult[] = [];

    // ============================================
    // CHECK 1: Users without roles (CRITICAL)
    // ============================================
    console.log('Checking for users without roles...');
    const { data: usersWithoutRoles, error: rolesError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        email,
        first_name,
        last_name,
        created_at
      `)
      .not('user_id', 'in', 
        supabase.from('user_roles').select('user_id')
      );

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
    }

    // Alternative query approach since nested NOT IN might not work
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, created_at');
    
    const { data: allRoles } = await supabase
      .from('user_roles')
      .select('user_id');

    const roleUserIds = new Set((allRoles || []).map(r => r.user_id));
    const usersNoRoles = (allProfiles || []).filter(p => !roleUserIds.has(p.user_id));

    if (usersNoRoles.length > 0) {
      console.log(`Found ${usersNoRoles.length} users without roles`);
      
      if (usersNoRoles.length <= 5) {
        // Individual alerts for small numbers
        for (const user of usersNoRoles) {
          results.push({
            type: 'missing_role',
            severity: 'critical',
            title: `Użytkownik bez roli: ${user.email}`,
            description: `Użytkownik ${user.first_name || ''} ${user.last_name || ''} (${user.email}) nie ma przypisanej roli. To oznacza błąd w triggerze handle_new_user lub ręczną modyfikację danych.`,
            suggestedAction: 'Przejdź do zakładki Użytkownicy i przypisz odpowiednią rolę. Sprawdź również trigger handle_new_user w bazie danych.',
            affectedUserId: user.user_id,
            affectedEntityType: 'user',
            metadata: {
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              created_at: user.created_at
            }
          });
        }
      } else {
        // Grouped alert for large numbers
        results.push({
          type: 'missing_role_group',
          severity: 'critical',
          title: `${usersNoRoles.length} użytkowników bez przypisanej roli`,
          description: `Wykryto ${usersNoRoles.length} użytkowników bez zdefiniowanej roli w systemie. To może oznaczać problem z triggerem rejestracji.`,
          suggestedAction: 'Przejdź do zakładki Użytkownicy, filtruj "bez roli" i przypisz odpowiednie role. Sprawdź trigger handle_new_user.',
          metadata: {
            count: usersNoRoles.length,
            sample_emails: usersNoRoles.slice(0, 10).map(u => u.email)
          }
        });
      }
    }

    // ============================================
    // CHECK 2: Users awaiting approval > 24h (INFO)
    // ============================================
    console.log('Checking for users awaiting approval > 24h...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: pendingUsers, error: pendingError } = await supabase
      .from('profiles')
      .select('user_id, email, first_name, last_name, created_at, guardian_approved, admin_approved')
      .or('admin_approved.is.null,admin_approved.eq.false')
      .lt('created_at', twentyFourHoursAgo)
      .eq('is_active', true);

    if (pendingError) {
      console.error('Error checking pending users:', pendingError);
    }

    if (pendingUsers && pendingUsers.length > 0) {
      console.log(`Found ${pendingUsers.length} users awaiting approval > 24h`);
      
      if (pendingUsers.length <= 3) {
        for (const user of pendingUsers) {
          const awaitingGuardian = !user.guardian_approved;
          const awaitingAdmin = user.guardian_approved && !user.admin_approved;
          
          results.push({
            type: 'unapproved_user_24h',
            severity: 'info',
            title: `Konto oczekuje na zatwierdzenie: ${user.email}`,
            description: awaitingGuardian 
              ? `Użytkownik ${user.first_name || ''} ${user.last_name || ''} czeka na zatwierdzenie przez opiekuna ponad 24 godziny.`
              : `Użytkownik ${user.first_name || ''} ${user.last_name || ''} czeka na zatwierdzenie przez administratora ponad 24 godziny.`,
            suggestedAction: awaitingGuardian 
              ? 'Skontaktuj się z opiekunem użytkownika lub użyj funkcji "Zatwierdź z pominięciem opiekuna".'
              : 'Zweryfikuj i zatwierdź konto użytkownika w zakładce Użytkownicy.',
            affectedUserId: user.user_id,
            affectedEntityType: 'user',
            metadata: {
              email: user.email,
              awaiting_guardian: awaitingGuardian,
              awaiting_admin: awaitingAdmin,
              created_at: user.created_at
            }
          });
        }
      } else {
        results.push({
          type: 'unapproved_users_group',
          severity: 'info',
          title: `${pendingUsers.length} kont oczekuje na zatwierdzenie > 24h`,
          description: `Wykryto ${pendingUsers.length} kont oczekujących na zatwierdzenie dłużej niż 24 godziny.`,
          suggestedAction: 'Przejdź do zakładki Użytkownicy i zweryfikuj oczekujące konta.',
          metadata: {
            count: pendingUsers.length,
            sample_emails: pendingUsers.slice(0, 10).map(u => u.email)
          }
        });
      }
    }

    // ============================================
    // CHECK 3: Missing training assignments (WARNING)
    // ============================================
    console.log('Checking for missing training assignments...');
    
    const { data: activeModules } = await supabase
      .from('training_modules')
      .select('id, title, visible_to_partners, visible_to_specjalista, visible_to_clients, visible_to_everyone')
      .eq('is_active', true);

    const { data: usersWithRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const { data: assignments } = await supabase
      .from('training_assignments')
      .select('user_id, module_id');

    if (activeModules && usersWithRoles && assignments) {
      const assignmentSet = new Set(
        (assignments || []).map(a => `${a.user_id}-${a.module_id}`)
      );

      const usersWithMissingAssignments: { userId: string; role: string; missingCount: number }[] = [];

      for (const userRole of usersWithRoles) {
        const role = userRole.role;
        let missingCount = 0;

        for (const module of activeModules) {
          const shouldHaveAccess = 
            module.visible_to_everyone ||
            (role === 'partner' && module.visible_to_partners) ||
            (role === 'specjalista' && module.visible_to_specjalista) ||
            (role === 'client' && module.visible_to_clients) ||
            role === 'admin';

          if (shouldHaveAccess) {
            const key = `${userRole.user_id}-${module.id}`;
            if (!assignmentSet.has(key)) {
              missingCount++;
            }
          }
        }

        if (missingCount > 0) {
          usersWithMissingAssignments.push({
            userId: userRole.user_id,
            role: role,
            missingCount
          });
        }
      }

      if (usersWithMissingAssignments.length > 0) {
        console.log(`Found ${usersWithMissingAssignments.length} users with missing training assignments`);
        
        results.push({
          type: 'missing_training_group',
          severity: 'warning',
          title: `${usersWithMissingAssignments.length} użytkowników z brakującymi szkoleniami`,
          description: `Wykryto użytkowników, którzy powinni mieć przypisane szkolenia, ale ich nie mają. Mogą użyć przycisku "Odśwież akademię" lub admin może ręcznie zatwierdzić szkolenie.`,
          suggestedAction: 'Poinformuj użytkowników o funkcji "Odśwież akademię" w zakładce Akademia lub użyj przycisku "Zatwierdź" w panelu postępów.',
          metadata: {
            count: usersWithMissingAssignments.length,
            sample_users: usersWithMissingAssignments.slice(0, 10)
          }
        });
      }
    }

    // ============================================
    // SAVE RESULTS TO admin_alerts
    // ============================================
    console.log(`Health check complete. Found ${results.length} issues.`);

    for (const result of results) {
      // Check if similar unresolved alert already exists
      const { data: existing } = await supabase
        .from('admin_alerts')
        .select('id')
        .eq('alert_type', result.type)
        .eq('is_resolved', false)
        .maybeSingle();

      if (existing) {
        // Update existing alert
        await supabase
          .from('admin_alerts')
          .update({
            title: result.title,
            description: result.description,
            severity: result.severity,
            suggested_action: result.suggestedAction,
            metadata: result.metadata || {},
            detected_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new alert
        await supabase
          .from('admin_alerts')
          .insert({
            alert_type: result.type,
            severity: result.severity,
            title: result.title,
            description: result.description,
            suggested_action: result.suggestedAction,
            affected_user_id: result.affectedUserId || null,
            affected_entity_type: result.affectedEntityType || null,
            affected_entity_id: result.affectedEntityId || null,
            metadata: result.metadata || {}
          });
      }
    }

    // Auto-resolve alerts that are no longer issues
    const activeAlertTypes = new Set(results.map(r => r.type));
    
    const { data: unresolvedAlerts } = await supabase
      .from('admin_alerts')
      .select('id, alert_type')
      .eq('is_resolved', false);

    for (const alert of unresolvedAlerts || []) {
      // If we checked this type but didn't find issues, auto-resolve
      const typePrefix = alert.alert_type.replace(/_group$/, '');
      const wasChecked = ['missing_role', 'missing_training', 'unapproved_user_24h'].includes(typePrefix);
      
      if (wasChecked && !activeAlertTypes.has(alert.alert_type)) {
        await supabase
          .from('admin_alerts')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_notes: 'Auto-rozwiązane - problem już nie występuje'
          })
          .eq('id', alert.id);
      }
    }

    // Update cron_settings
    await supabase
      .from('cron_settings')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      })
      .eq('job_name', 'system-health-check');

    // Log to cron_job_logs
    await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'system-health-check',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        processed_count: results.length,
        details: {
          alerts_created: results.length,
          alert_types: [...new Set(results.map(r => r.type))]
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        alertsFound: results.length,
        message: `Health check completed. Found ${results.length} issues.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('System health check error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
