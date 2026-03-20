import { Link, useLocation, useParams, useSearchParams } from "react-router-dom"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "../../store/authStore"
import { reportsApi, fluidsApi } from "../../lib/api"

export const Breadcrumbs = () => {
  const location = useLocation()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { sessionToken } = useAuthStore()
  const [reportName, setReportName] = useState<string | null>(null)
  const [fluidName, setFluidName] = useState<string | null>(null)

  // Map de rutas especiales para mostrar nombres legibles
  const routeNames: Record<string, string> = {
    'dashboard': t('breadcrumbs.dashboard'),
    'reports': t('breadcrumbs.reports'),
    'admin': t('breadcrumbs.admin'),
    'test': t('breadcrumbs.test'),
    'new': t('breadcrumbs.new'),
    'edit': t('breadcrumbs.edit'),
    'view': t('breadcrumbs.view'),
    'logistics': t('breadcrumbs.logistics'),
    'approvals': t('breadcrumbs.approvals'),
    'fluids': t('nav.fluids'),
    'incidents': t('breadcrumbs.incidents'),
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
  const isFluidRoute = location.pathname.includes('/fluids/view/') ||
                       location.pathname.includes('/fluids/edit/')
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

  // Cargar nombre del reporte de fluidos si estamos en una ruta de fluidos
  useEffect(() => {
    const loadFluidName = async () => {
      if (isFluidRoute && reportId && sessionToken) {
        try {
          const fluid = await fluidsApi.get(sessionToken, reportId)
          const well = fluid.wellNumber || '-'
          setFluidName(`${well} (#${fluid.reportNumber || '-'})`)
        } catch (error) {
          console.error('Error loading fluid report for breadcrumb:', error)
          setFluidName(t('nav.fluids'))
        }
      }
    }

    loadFluidName()
  }, [isFluidRoute, reportId, sessionToken])

  // Construir breadcrumbs
  const segments = location.pathname.split('/').filter((crumb) => crumb !== '')

  const crumbs: Array<{ displayName: string; link: string; isLast: boolean }> = []

  // Check if first segment should be overridden by ?from param
  // e.g. /reports/view/:id?from=approvals → replace "Reportes" with "Aprobaciones"
  const override = fromParam ? fromOverrides[fromParam] : null

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isEntityId = (segment.includes('-') && segment.length > 20) ||
                       (i > 0 && (segments[i - 1] === 'view' || segments[i - 1] === 'edit') && !routeNames[segment.toLowerCase()])

    // Si es un ID y el segmento anterior es "view" o "edit"
    if (isEntityId && i > 0 && (segments[i - 1] === 'view' || segments[i - 1] === 'edit')) {
      // Determinar el nombre a mostrar según la ruta
      const entityName = isFluidRoute
        ? (fluidName || t('breadcrumbs.loading'))
        : (reportName || t('breadcrumbs.loading'))
      // Agregar el nombre al breadcrumb anterior
      const lastCrumb = crumbs[crumbs.length - 1]
      if (lastCrumb) {
        crumbs[crumbs.length - 1] = {
          ...lastCrumb,
          displayName: `${lastCrumb.displayName}: ${entityName}`,
        }
      }
      // No agregar el UUID como crumb separado
      continue
    }

    // Si es un ID sin contexto, skip
    if (isEntityId) {
      continue
    }

    // Override the first segment (e.g. "reports") when ?from is present
    if (i === 0 && override) {
      const nextSegOverride = i < segments.length - 1 ? segments[i + 1] : null
      const hasIdNext = nextSegOverride != null &&
                       (nextSegOverride.includes('-') || !routeNames[nextSegOverride.toLowerCase()])
      const isLast = i === segments.length - 1 || hasIdNext

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
    const nextSeg = i < segments.length - 1 ? segments[i + 1] : null
    const hasEntityIdNext = nextSeg != null &&
                           (segment === 'view' || segment === 'edit') &&
                           !routeNames[nextSeg.toLowerCase()]
    const isLast = i === segments.length - 1 || hasEntityIdNext

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
        {t('breadcrumbs.home')}
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
