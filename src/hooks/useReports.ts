import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../store/authStore';
import type { Report, CreateReportRequest } from '../types';
import type { ReportFilters } from '../types/report';

export function useReports(filters?: ReportFilters) {
  const { sessionToken } = useAuthStore();

  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      if (!sessionToken) throw new Error('No session token');
      return invoke<Report[]>('list_reports', {
        sessionToken,
        filters: filters || {},
      });
    },
    enabled: !!sessionToken,
  });
}

export function useCreateReport() {
  const { sessionToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: CreateReportRequest) => {
      if (!sessionToken) throw new Error('No session token');
      return invoke<Report>('create_report', {
        sessionToken,
        reportData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useSubmitReport() {
  const { sessionToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      if (!sessionToken) throw new Error('No session token');
      return invoke<Report>('submit_report', {
        sessionToken,
        reportId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
