function mat = generate_NT_matrix(K)
lo = 100;
hi = 100000;
a = exp(1/499 * log(hi/lo));
b = log(lo)/log(a);
for i = 1:500
    N(i,1) = a^(b+i-1);
end
N = flip(round(N));
N(333) = 1000;
if length(unique(N)) ~= 500
    disp('repeated N!')
    return
end

T = 1:0.5:200;
mat = [];
for i = 1:length(N)
    for j = 1:length(T)
        mat(i, j) = get_acc(N(i), T(j), K);
    end
end

end

function acc = get_acc(n, t, K)
n = n*0.9;
acc = 0;
for i = 1:size(K, 1)
    acc = acc + sqrt(1/(1 + (K(i,2)/n) + (K(i,3)/(n*t))));
end
acc = acc/size(K, 1);

end