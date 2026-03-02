
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProjectProvider } from './store/ProjectContext';
import { LanguageProvider } from './store/LanguageContext';

import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import SoilStratigraphy from './pages/SoilStratigraphy';
import AxialCapacity from './pages/AxialCapacity';
import PipePilePlugging from './pages/PipePilePlugging';
import LoadTestLab from './pages/LoadTestLab';
import LateralAnalysis from './pages/LateralAnalysis';
import LoadTestReport from './pages/LoadTestReport';
import ComingSoon from './pages/ComingSoon';

import { AppLayout } from './components/AppLayout';

function App() {
    return (
        <LanguageProvider>
            <ProjectProvider>
                <BrowserRouter>
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/soil-stratigraphy" element={<SoilStratigraphy />} />
                            <Route path="/axial-capacity" element={<AxialCapacity />} />
                            <Route path="/pipe-pile-plugging" element={<PipePilePlugging />} />
                            <Route path="/load-test-lab" element={<LoadTestLab />} />
                            <Route path="/lateral-analysis" element={<LateralAnalysis />} />
                            <Route path="/pile-designer" element={<ComingSoon title="Pile Designer" icon="design_services" />} />
                            <Route path="/sensitivity" element={<ComingSoon title="Sensitivity Analysis" icon="tune" />} />
                            <Route path="/report" element={<LoadTestReport />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </ProjectProvider>
        </LanguageProvider>
    );
}

export default App;
