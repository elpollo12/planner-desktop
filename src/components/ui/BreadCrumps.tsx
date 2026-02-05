import { Link, useLocation } from "react-router-dom"

export const BreadCrumps = () => {
    const location = useLocation();
    let ocurrentLink = '';
    const crumbs = location.pathname.split('/').filter((crumb) => crumb !== '').map((crumb, index, array) => {
        ocurrentLink += `/${crumb}`;
        const isLast = index === array.length - 1;
        
        return (
            <div key={crumb} className="flex items-center">
                <Link 
                    to={ocurrentLink}
                    className={`${
                        isLast 
                            ? 'text-gray-900 font-semibold cursor-default pointer-events-none' 
                            : 'text-primary-600 hover:text-primary-700 font-medium hover:underline'
                    } transition-colors`}
                >
                    {crumb.charAt(0).toUpperCase() + crumb.slice(1)}
                </Link>
                {!isLast && (
                    <span className="mx-2 text-gray-400">/</span>
                )}
            </div>
        )
    });
    
    return (
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap text-sm text-gray-600 mt-2">
            <Link 
                to="/" 
                className="text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors"
            >
                Home
            </Link>
            {crumbs.length > 0 && <span className="mx-2 text-gray-400">/</span>}
            {crumbs}
        </nav>
    )
}