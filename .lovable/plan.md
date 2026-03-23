
# Completed: Modernization of lesson completion system

All changes have been implemented:
1. Explicit "Zalicz lekcję" button replaces auto-completion
2. 80% video threshold (tolerant for iOS)
3. Free navigation between lessons (no locks)
4. Auto-save removed — position saved only on tab switch/unload
5. `completion_method` column added to training_lessons (auto/manual)
6. Admin form updated with completion method selector
7. TrainingModule.tsx reduced from 1624 to 1101 lines
