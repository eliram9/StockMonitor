
interface ContentSectionProps {
    title: string;
    content: React.ReactNode[];
    sectionType: 'what-happened' | 'why-it-matters' | 'whats-next';
}

export function ContentSection({ title, content, sectionType }: ContentSectionProps) {
    const renderContent = () => {
        if (sectionType === 'what-happened') {
        // No bullet points for "What Happened" - render as paragraphs
            return (
                <div className="space-y-2">
                    {content.map((item, index) => (
                        <div key={`${sectionType}-${index}`} className="text-sm modal-text">{item}</div>
                    ))}
                </div>
            );
            } else {
            // Render with bullet points for "Why It Matters" and "What's Next"
            return (
                <div className="space-y-1">
                    {content.map((item, index) => (
                        <div key={`${sectionType}-${index}`} className="flex items-baseline">
                            <span className="text-blue-500 mr-2">•</span>
                            <span className="text-sm modal-text">
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
    };

    return (
        <div className="bg-white pt-6 rounded-lg mb-3">
            <h3 className="text-lg font-semibold mb-2 pb-2">{title}</h3>
            {renderContent()}
        </div>
    );
}