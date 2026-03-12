import { Link, useLocation, useParams, useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../store/authStore"
import { reportsApi } from "../../lib/api"

export const Breadcrumbs = () => {
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { sessionToken } = useAuthStore()
  const [reportName, setReportName] = useState<string | null>(null)

  // Map de rutas especiales para mostrar nombres legibles
  const routeNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'reports': t('breadcrumbs.reports'),
    'admin': 'Admin',
    'test': 'Test',
    'new': t('breadcrumbs.new'),
    'edit': t('breadcrumbs.edit'),
    'view': t('breadcrumbs.view'),
    'logistics': t('breadcrumbs.logistics'),
    'approvals': t('breadcrumbs.approvals'),
  }

  // Map of ?from values to their display info
  const fromOverrides: Record<string, { displayName: string; link: string }> = {
    'approvals': { displayName: t('breadcrumbs.approvals'), link: '/approvals' },
  }

  // Read ?from param for origin override
  const fromParam = searchParams.get('from')

  // Detectar si estamos en una ruta de reporte con ID
  const isReportRoute = location.pathname.includes('/reports/view/') ||
                        location.pathname.includes('/reports/edit/')
  const reportId = params.id

  // Cargar nombre del reporte si estamos en una ruta de reporte
  useEffect(() => {
    const loadReportName = async () => {
      if (isReportRoute && reportId && sessionToken) {
        try {
          const report = await reportsApi.get(sessionToken, reportId)
          setReportName(t('breadcrumbs.reportNumber', { number: report.reportNumber }))
        } catch (error) {
          console.error('Error loading report for breadcrumb:', error)
          setReportName(t('breadcrumbs.report'))
        }
      }
    }

    loadReportName()
  }, [isReportRoute, reportId, sessionToken])

  // Construir breadcrumbs
  const segments = location.pathname.split('/').filter((crumb) => crumb !== '')

  const crumbs: Array<{ displayName: string; link: string; isLast: boolean }> = []

  // Check if first segment should be overridden by ?from param
  // e.g. /reports/view/:id?from=approvals → replace "Reportes" with "Aprobaciones"
  const override = fromParam ? fromOverrides[fromParam] : null

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isUUID = segment.includes('-') && segment.length > 20

    // Si es un UUID y el segmento anterior es "view" o "edit"
    if (isUUID && i > 0 && (segments[i - 1] === 'view' || segments[i - 1] === 'edit')) {
      // Agregar el nombre del reporte al breadcrumb anterior como ": Reporte #123"
      const lastCrumb = crumbs[crumbs.length - 1]
      if (lastCrumb) {
        crumbs[crumbs.length - 1] = {
          ...lastCrumb,
          displayName: `${lastCrumb.displayName}: ${reportName || t('breadcrumbs.loading')}`,
        }
      }
      // No agregar el UUID como crumb separado
      continue
    }

    // Si es un UUID sin contexto, skip
    if (isUUID) {
      continue
    }

    // Override the first segment (e.g. "reports") when ?from is present
    if (i === 0 && override) {
      const hasUUIDNext = i < segments.length - 1 &&
                         segments[i + 1].includes('-') &&
                         segments[i + 1].length > 20
      const isLast = i === segments.length - 1 || hasUUIDNext

      crumbs.push({
        displayName: override.displayName,
        link: override.link,
        isLast,
      })
      continue
    }

    // Construir el link hasta este punto
    let link = ''
    for (let j = 0; j <= i; j++) {
      link += `/${segments[j]}`
    }

    // Obtener el nombre a mostrar
    const displayName = routeNames[segment.toLowerCase()] ||
                       segment.charAt(0).toUpperCase() + segment.slice(1)

    // Determinar si es el último crumb clickeable (no el último si hay UUID después)
    const hasUUIDNext = i < segments.length - 1 &&
                       segments[i + 1].includes('-') &&
                       segments[i + 1].length > 20
    const isLast = i === segments.length - 1 || hasUUIDNext

    crumbs.push({
      displayName,
      link,
      isLast,
    })
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center flex-wrap text-sm text-gray-600 dark:text-gray-400"
    >
      <Link
        to="/"
        className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
      >
        Home
      </Link>
      {crumbs.length > 0 && <span className="mx-2 text-gray-400">/</span>}
      {crumbs.map((crumb, index) => (
        <div key={`${crumb.link}-${index}`} className="flex items-center">
          {crumb.isLast ? (
            <span className="text-gray-900 dark:text-gray-100 font-semibold">
              {crumb.displayName}
            </span>
          ) : (
            <Link
              to={crumb.link}
              className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
            >
              {crumb.displayName}
            </Link>
          )}
          {index < crumbs.length - 1 && (
            <span className="mx-2 text-gray-400">/</span>
          )}
        </div>
      ))}
    </nav>
  )
}
